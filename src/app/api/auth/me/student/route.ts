import { createAdminClient, createClientWithUser } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/auth/me/student
 *
 * Returns the student record (id) that belongs to the currently authenticated user.
 * Used by /students/me to redirect to the correct student detail page.
 */
export async function GET() {
  try {
    const { supabase, user } = await createClientWithUser();
    const adminClient = await createAdminClient();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the student record linked to this profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลผู้ใช้' }, { status: 404 });
    }

    const { data: currentYear } = await adminClient
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    if (!currentYear?.id) {
      return NextResponse.json({ error: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' }, { status: 404 });
    }

    const { data: enrollment } = await adminClient
      .from('student_enrollments')
      .select('students!inner(id, profile_id)')
      .eq('academic_year_id', currentYear.id)
      .eq('students.profile_id', profile.id)
      .maybeSingle();

    const student = enrollment?.students as { id?: string } | null | undefined;

    if (!student?.id) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลนักเรียนในปีการศึกษาปัจจุบัน' }, { status: 404 });
    }

    return NextResponse.json({ id: student.id });
  } catch (err) {
    console.error('[StudentMe API] Error:', err);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
