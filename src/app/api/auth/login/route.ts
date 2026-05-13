import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getRequestAuditInfo, logAction } from '@/lib/audit/log';
import { apiMessage } from '@/lib/i18n/api';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const requestInfo = getRequestAuditInfo(request);
  try {
    const rateKey = `login:${requestInfo.ipAddress || 'unknown'}`;
    if (!(await checkRateLimit(rateKey, 20, 60_000))) {
      await logAction({
        event: 'login_rate_limited',
        resourceType: 'auth',
        metadata: { reason: 'rate_limited' },
        ...requestInfo,
      });
      return NextResponse.json({ error: apiMessage(request, 'rateLimited') }, { status: 429 });
    }

    const body = await request.json();
    const { email, password, student_id } = body;

    // Validate: must have either email+password or student_id+password
    if ((!email || !password) && (!student_id || !password)) {
      await logAction({
        event: 'login_failed',
        resourceType: student_id ? 'student' : 'user',
        metadata: { reason: 'missing_credentials', login_type: student_id ? 'student' : 'staff' },
        ...requestInfo,
      });
      return NextResponse.json(
        { error: apiMessage(request, 'loginMissingCredentials') },
        { status: 400 }
      );
    }

    // Create admin client for user lookup (uses SERVICE_ROLE_KEY)
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Create anon client for sign-in
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      }
    );

    // For student login, resolve student_id_number to email first
    let loginEmail = email;
    if (student_id) {
      const { data: currentYear, error: currentYearError } = await supabaseAdmin
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      if (currentYearError || !currentYear?.id) {
        await logAction({ event: 'login_failed', resourceType: 'student', metadata: { reason: 'no_current_academic_year' }, ...requestInfo });
        return NextResponse.json(
          { error: apiMessage(request, 'noCurrentAcademicYear') },
          { status: 401 }
        );
      }

      // Student numbers are reused across years, so login resolves only within the current academic year.
      // Only active enrollments for active students are allowed to log in.
      const { data: enrollmentData, error: enrollmentError } = await supabaseAdmin
        .from('student_enrollments')
        .select('students!inner(profile_id, student_id_number, current_status)')
        .eq('academic_year_id', currentYear.id)
        .eq('students.student_id_number', student_id)
        .eq('enrollment_status', 'active')
        .eq('students.current_status', 'active')
        .limit(2);

      if (enrollmentError || !enrollmentData || enrollmentData.length === 0) {
        await logAction({ event: 'login_failed', resourceType: 'student', metadata: { reason: 'student_not_found_current_year', student_id }, ...requestInfo });
        return NextResponse.json(
          { error: apiMessage(request, 'studentNotFoundCurrentYear') },
          { status: 401 }
        );
      }

      if (enrollmentData.length > 1) {
        await logAction({ event: 'login_failed', resourceType: 'student', metadata: { reason: 'duplicate_student_number_current_year', student_id }, ...requestInfo });
        return NextResponse.json(
          { error: apiMessage(request, 'duplicateStudentNumberCurrentYear') },
          { status: 401 }
        );
      }

      const studentData = (enrollmentData[0].students || {}) as { profile_id?: string };

      // Get the profile's user_id
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('id', studentData.profile_id)
        .single();

      if (profileError || !profileData?.user_id) {
        await logAction({ event: 'login_failed', resourceType: 'student', metadata: { reason: 'profile_not_found', student_id }, ...requestInfo });
        return NextResponse.json(
          { error: apiMessage(request, 'profileNotFoundContactAdmin') },
          { status: 401 }
        );
      }

      // Get the user's email from auth.users (requires service_role key)
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profileData.user_id);
      if (userError || !userData?.user?.email) {
        await logAction({ event: 'login_failed', resourceType: 'student', metadata: { reason: 'auth_email_not_found', student_id }, ...requestInfo });
        return NextResponse.json(
          { error: apiMessage(request, 'authEmailNotFoundContactAdmin') },
          { status: 401 }
        );
      }
      loginEmail = userData.user.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      console.error('[Login API] signInWithPassword error:', error.message, error.status);
      await logAction({
        event: 'login_failed',
        resourceType: student_id ? 'student' : 'user',
        metadata: { reason: 'invalid_credentials', login_type: student_id ? 'student' : 'staff', status: error.status },
        ...requestInfo,
      });
      const message = error.message === 'Invalid login credentials'
        ? apiMessage(request, 'invalidLoginCredentials')
        : error.message || apiMessage(request, 'genericTryAgain');
      return NextResponse.json({ error: message, details: error.message }, { status: 401 });
    }

    if (!data.session) {
      await logAction({ event: 'login_failed', resourceType: 'user', metadata: { reason: 'missing_session' }, ...requestInfo });
      return NextResponse.json(
        { error: apiMessage(request, 'missingSession') },
        { status: 500 }
      );
    }

    // Look up the user's profile for role and must_change_password
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('id, role, is_active, must_change_password, full_name')
      .eq('user_id', data.user.id)
      .single();

    if (!profileData) {
      await logAction({ event: 'login_failed', resourceType: 'user', metadata: { reason: 'profile_not_found_after_login', user_id: data.user.id }, ...requestInfo });
      return NextResponse.json(
        { error: apiMessage(request, 'profileNotFoundContactAdmin') },
        { status: 401 }
      );
    }

    if (!profileData.is_active) {
      await logAction({ actorId: profileData.id, event: 'login_failed', resourceType: 'profile', resourceId: profileData.id, metadata: { reason: 'inactive_account' }, ...requestInfo });
      return NextResponse.json(
        { error: apiMessage(request, 'inactiveAccountContactAdmin') },
        { status: 403 }
      );
    }

    // Update last_login_at
    await supabaseAdmin
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profileData.id);

    await logAction({
      actorId: profileData.id,
      event: 'login_success',
      resourceType: 'profile',
      resourceId: profileData.id,
      metadata: { login_type: student_id ? 'student' : 'staff', role: profileData.role },
      ...requestInfo,
    });

    // Build the response with role info
    const response = NextResponse.json({
      success: true,
      role: profileData.role,
      must_change_password: profileData.must_change_password,
      full_name: profileData.full_name,
    });

    // Store only the fields needed by createClientWithUser(). The full Supabase
    // session includes user metadata and can exceed browser cookie limits.
    const maxAge = 400 * 24 * 60 * 60; // 400 days
    const sessionJson = JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    });
    const base64url = Buffer.from(sessionJson)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const cookieVal = `base64-${base64url}`;

    response.cookies.set('supabase.auth.token', cookieVal, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: request.headers.get('x-forwarded-proto') === 'https',
      httpOnly: false,
    });

    return response;
  } catch (err) {
    console.error('[Login API Route] Error:', err);
    return NextResponse.json(
      { error: apiMessage(request, 'internalError') },
      { status: 500 }
    );
  }
}
