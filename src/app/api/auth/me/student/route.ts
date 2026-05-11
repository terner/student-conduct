import { createAdminClient, getUserFromCookie } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { apiMessage } from '@/lib/i18n/api';

/**
 * GET /api/auth/me/student
 *
 * Returns the student record (id) that belongs to the currently authenticated user.
 * Used by /students/me to redirect to the correct student detail page.
 */
export async function GET(request: Request) {
  try {
    const user = await getUserFromCookie();
    const adminClient = await createAdminClient();

    if (!user) {
      return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
    }

    // Find the student record linked to this profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: apiMessage(request, 'profileNotFound') }, { status: 404 });
    }

    const { data: currentYear } = await adminClient
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    if (!currentYear?.id) {
      return NextResponse.json({ error: apiMessage(request, 'noCurrentAcademicYear') }, { status: 404 });
    }

    const { data: enrollment } = await adminClient
      .from('student_enrollments')
      .select('students!inner(id, profile_id)')
      .eq('academic_year_id', currentYear.id)
      .eq('students.profile_id', profile.id)
      .maybeSingle();

    const student = enrollment?.students as { id?: string } | null | undefined;

    if (!student?.id) {
      return NextResponse.json({ error: apiMessage(request, 'studentNotFoundCurrentYear') }, { status: 404 });
    }

    return NextResponse.json({ id: student.id });
  } catch (err) {
    console.error('[StudentMe API] Error:', err);
    return NextResponse.json({ error: apiMessage(request, 'internalError') }, { status: 500 });
  }
}
