import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, student_id } = body;

    // Validate: must have either email+password or student_id+password
    if ((!email || !password) && (!student_id || !password)) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมล/รหัสนักเรียนและรหัสผ่าน' },
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
        return NextResponse.json(
          { error: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' },
          { status: 401 }
        );
      }

      // Student numbers are reused across years, so login resolves only within the current academic year.
      const { data: enrollmentData, error: enrollmentError } = await supabaseAdmin
        .from('student_enrollments')
        .select('students!inner(profile_id, student_id_number)')
        .eq('academic_year_id', currentYear.id)
        .eq('students.student_id_number', student_id)
        .limit(2);

      if (enrollmentError || !enrollmentData || enrollmentData.length === 0) {
        return NextResponse.json(
          { error: 'ไม่พบรหัสนักเรียนนี้ในปีการศึกษาปัจจุบัน' },
          { status: 401 }
        );
      }

      if (enrollmentData.length > 1) {
        return NextResponse.json(
          { error: 'พบเลขนักเรียนซ้ำในปีการศึกษาปัจจุบัน กรุณาติดต่อผู้ดูแลระบบ' },
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
        return NextResponse.json(
          { error: 'ไม่พบข้อมูลผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ' },
          { status: 401 }
        );
      }

      // Get the user's email from auth.users (requires service_role key)
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profileData.user_id);
      if (userError || !userData?.user?.email) {
        return NextResponse.json(
          { error: 'ไม่พบอีเมลผู้ใช้ กรุณาติดต่อผู้ดูแลระบบ' },
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
      const message = error.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      return NextResponse.json({ error: message, details: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'ไม่ได้รับข้อมูล session' },
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
      return NextResponse.json(
        { error: 'ไม่พบข้อมูลผู้ใช้ในระบบ กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 401 }
      );
    }

    if (!profileData.is_active) {
      return NextResponse.json(
        { error: 'บัญชีผู้ใช้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    // Update last_login_at
    await supabaseAdmin
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', profileData.id);

    // Build the response with role info
    const response = NextResponse.json({
      success: true,
      role: profileData.role,
      must_change_password: profileData.must_change_password,
      full_name: profileData.full_name,
    });

    // Encode session as base64url cookie (matching our custom server.ts decoder)
    const maxAge = 400 * 24 * 60 * 60; // 400 days
    const sessionJson = JSON.stringify(data.session);
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
      { error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
