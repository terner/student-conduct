'use server';

import { withAuth, type ActionResult } from '@/lib/server-action';
import { listStudents, getStudentById, createStudent, updateStudent, getStudentScoreSummary, getStudentEnrollments } from '@/lib/db';
import { studentSchema, paginationSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { createClient } from '@/lib/supabase/server';

export async function getStudents(params: {
  page?: number;
  page_size?: number;
  search?: string;
  classroom_id?: string;
  grade_level?: number;
  education_stage?: 'primary' | 'secondary';
  status?: string;
}) {
  return withAuth(async (profile) => {
    const validated = paginationSchema.parse(params);
    const result = await listStudents(validated);
    return { success: true, data: result };
  });
}

export async function getStudent(id: string) {
  return withAuth(async () => {
    const student = await getStudentById(id);
    if (!student) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลนักเรียน' } };
    }
    return { success: true, data: student };
  });
}

export async function addStudent(data: {
  first_name: string;
  last_name: string;
  student_id_number: string;
  classroom_id: string;
  class_number: number;
}) {
  return withAuth(async (profile) => {
    // Validate
    const validated = studentSchema.parse(data);

    // XSS check
    const xssCheck = validateXSS({ first_name: validated.first_name, last_name: validated.last_name });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    // Get academic year
    const supabase = await createClient();
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single();

    const result = await createStudent({
      ...validated,
      academic_year_id: acYear?.id,
    });

    return { success: true, data: result };
  });
}

export async function editStudent(id: string, data: {
  first_name?: string;
  last_name?: string;
  student_id_number?: string;
  classroom_id?: string;
  current_status?: string;
}) {
  return withAuth(async (profile) => {
    const xssCheck = validateXSS({ ...data });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    await updateStudent(id, data);
    return { success: true, data: { id } };
  });
}

export async function getStudentScoreInfo(studentId: string) {
  return withAuth(async () => {
    const supabase = await createClient();
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single();

    const summary = await getStudentScoreSummary(studentId, acYear?.id);
    const transactions = await getStudentEnrollments(studentId);
    return { success: true, data: { summary, transactions } };
  });
}

export async function getStudentListForSelect() {
  return withAuth(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('students')
      .select(`
        id,
        student_id_number,
        profiles!inner(full_name),
        classrooms!inner(name)
      `)
      .eq('current_status', 'active')
      .order('profiles(full_name)');

    return {
      success: true,
      data: (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        student_id_number: s.student_id_number as string,
        full_name: (s.profiles as Record<string, unknown>)?.full_name as string || '',
        classroom_name: (s.classrooms as Record<string, unknown>)?.name as string || '',
      })),
    };
  });
}
