import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Search student by student_id_number for LINE registration
 * Returns student info if found in current academic year
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id_number } = body;

    if (!student_id_number || typeof student_id_number !== 'string') {
      return NextResponse.json({ success: false, error: 'กรุณากรอกรหัสนักเรียน' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Get current academic year
    const { data: currentYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    if (!currentYear) {
      return NextResponse.json({ success: false, error: 'ไม่พบปีการศึกษาปัจจุบัน' }, { status: 400 });
    }

    // Search student in current year
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        students!inner (
          id,
          student_id_number,
          profiles!inner (full_name)
        ),
        classrooms (name)
      `)
      .eq('academic_year_id', currentYear.id)
      .eq('students.student_id_number', student_id_number.trim())
      .eq('enrollment_status', 'active')
      .limit(1)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'ไม่พบรหัสนักเรียนนี้ในปีการศึกษาปัจจุบัน' });
    }

    const student = enrollment.students as unknown as { id: string; student_id_number: string; profiles: { full_name: string } };
    const classroom = enrollment.classrooms as unknown as { name: string } | null;

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        student_id_number: student.student_id_number,
        full_name: student.profiles?.full_name || '',
        classroom_name: classroom?.name || '',
      },
    });
  } catch (err) {
    console.error('[LINE Search Student] Error:', err);
    return NextResponse.json({ success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
