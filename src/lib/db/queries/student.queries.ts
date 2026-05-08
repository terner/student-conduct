import { createClient } from '@/lib/supabase/server';
import type { Student, StudentEnrollment } from '@/types';

export type StudentWithProfile = Student & {
  first_name: string;
  last_name: string;
  classroom_name: string;
  grade_level: number;
  education_stage: 'primary' | 'secondary';
};

export interface StudentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  classroom_id?: string;
  grade_level?: number;
  education_stage?: 'primary' | 'secondary';
  status?: string;
  academic_year?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * List students with pagination, search, and filters
 */
export async function listStudents(params: StudentListParams = {}): Promise<PaginatedResult<StudentWithProfile>> {
  const supabase = await createClient();
  const {
    page = 1,
    page_size = 20,
    search,
    classroom_id,
    grade_level,
    education_stage,
    status,
    academic_year,
  } = params;

  let query = supabase
    .from('students')
    .select(`
      *,
      profiles!inner(full_name),
      classrooms!inner(name, grade_level, education_stage)
    `, { count: 'exact' });

  // Filters
  if (search) {
    query = query.or(`student_id_number.ilike.%${search}%,profiles.full_name.ilike.%${search}%`);
  }
  if (classroom_id) {
    query = query.eq('classroom_id', classroom_id);
  }
  if (grade_level) {
    query = query.eq('classrooms.grade_level', grade_level);
  }
  if (education_stage) {
    query = query.eq('classrooms.education_stage', education_stage);
  }
  if (status) {
    query = query.eq('current_status', status);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  const { data, error, count } = await query
    .order('profiles(full_name)', { ascending: true })
    .range(from, to);

  if (error) throw error;

  const mapped: StudentWithProfile[] = (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    profile_id: s.profile_id as string,
    student_id_number: s.student_id_number as string,
    classroom_id: s.classroom_id as string,
    current_status: s.current_status as Student['current_status'],
    first_name: ((s.profiles as Record<string, unknown>)?.full_name as string || '').split(' ')[0] || '',
    last_name: ((s.profiles as Record<string, unknown>)?.full_name as string || '').split(' ').slice(1).join(' ') || '',
    classroom_name: (s.classrooms as Record<string, unknown>)?.name as string || '',
    grade_level: (s.classrooms as Record<string, unknown>)?.grade_level as number || 0,
    education_stage: (s.classrooms as Record<string, unknown>)?.education_stage as 'primary' | 'secondary' || 'primary',
  }));

  return {
    data: mapped,
    total: count || 0,
    page,
    page_size,
    total_pages: Math.ceil((count || 0) / page_size),
  };
}

/**
 * Get single student by ID with full details
 */
export async function getStudentById(id: string): Promise<StudentWithProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      profiles!inner(full_name),
      classrooms!inner(name, grade_level, education_stage)
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  if (!data) return null;

  return {
    id: data.id,
    profile_id: data.profile_id,
    student_id_number: data.student_id_number,
    classroom_id: data.classroom_id,
    current_status: data.current_status,
    first_name: (data.profiles?.full_name as string || '').split(' ')[0] || '',
    last_name: (data.profiles?.full_name as string || '').split(' ').slice(1).join(' ') || '',
    classroom_name: data.classrooms?.name as string || '',
    grade_level: data.classrooms?.grade_level as number || 0,
    education_stage: data.classrooms?.education_stage as 'primary' | 'secondary' || 'primary',
  };
}

/**
 * Get student score summary (total deducted, total added, current score)
 */
export async function getStudentScoreSummary(studentId: string, academicYearId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('score_transactions')
    .select('points, status')
    .eq('student_id', studentId)
    .eq('status', 'approved');

  if (academicYearId) {
    query = query.eq('academic_year_id', academicYearId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const totalDeducted = (data || [])
    .filter(t => t.points < 0)
    .reduce((sum, t) => sum + Math.abs(t.points), 0);

  const totalAdded = (data || [])
    .filter(t => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);

  return {
    total_deducted: totalDeducted,
    total_added: totalAdded,
    current_score: 100 - totalDeducted + totalAdded,
  };
}

/**
 * Get student enrollments
 */
export async function getStudentEnrollments(studentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('student_enrollments')
    .select(`
      *,
      classrooms(name, grade_level, education_stage),
      academic_years(name)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get students by classroom
 */
export async function getStudentsByClassroom(classroomId: string): Promise<StudentWithProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      profiles!inner(full_name),
      classrooms!inner(name, grade_level, education_stage)
    `)
    .eq('classroom_id', classroomId)
    .eq('current_status', 'active')
    .order('student_id_number');

  if (error) throw error;

  return (data || []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    profile_id: s.profile_id as string,
    student_id_number: s.student_id_number as string,
    classroom_id: s.classroom_id as string,
    current_status: s.current_status as Student['current_status'],
    first_name: ((s.profiles as Record<string, unknown>)?.full_name as string || '').split(' ')[0] || '',
    last_name: ((s.profiles as Record<string, unknown>)?.full_name as string || '').split(' ').slice(1).join(' ') || '',
    classroom_name: (s.classrooms as Record<string, unknown>)?.name as string || '',
    grade_level: (s.classrooms as Record<string, unknown>)?.grade_level as number || 0,
    education_stage: (s.classrooms as Record<string, unknown>)?.education_stage as 'primary' | 'secondary' || 'primary',
  }));
}

/**
 * Create a new student with profile and enrollment
 */
export async function createStudent(data: {
  first_name: string;
  last_name: string;
  student_id_number: string;
  classroom_id: string;
  class_number: number;
  academic_year_id?: string;
}) {
  const supabase = await createClient();

  // 1. Create auth user for student
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: `${data.student_id_number}@student.school.com`,
    password: 'Student@123',
    email_confirm: true,
    user_metadata: { full_name: `${data.first_name} ${data.last_name}`, role: 'student' },
  });

  if (authError) throw authError;
  if (!authUser.user) throw new Error('Failed to create auth user');

  // 2. Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: authUser.user.id,
      role: 'student',
      full_name: `${data.first_name} ${data.last_name}`,
      is_active: true,
    })
    .select('id')
    .single();

  if (profileError) {
    // Rollback auth user
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw profileError;
  }

  // 3. Create student record
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      profile_id: profile.id,
      student_id_number: data.student_id_number,
      classroom_id: data.classroom_id,
      current_status: 'active',
    })
    .select('id')
    .single();

  if (studentError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw studentError;
  }

  // 4. Create enrollment
  const { error: enrollmentError } = await supabase
    .from('student_enrollments')
    .insert({
      student_id: student.id,
      classroom_id: data.classroom_id,
      class_number: data.class_number,
      enrollment_status: 'active',
      source: 'manual',
    });

  if (enrollmentError) throw enrollmentError;

  return student;
}

/**
 * Update student
 */
export async function updateStudent(id: string, data: {
  first_name?: string;
  last_name?: string;
  student_id_number?: string;
  classroom_id?: string;
  current_status?: string;
}) {
  const supabase = await createClient();

  if (data.first_name || data.last_name) {
    // Get current student to find profile_id
    const { data: student } = await supabase
      .from('students')
      .select('profile_id')
      .eq('id', id)
      .single();

    if (student?.profile_id) {
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
      if (fullName) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', student.profile_id);
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.student_id_number) updateData.student_id_number = data.student_id_number;
  if (data.classroom_id) updateData.classroom_id = data.classroom_id;
  if (data.current_status) updateData.current_status = data.current_status;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  return { success: true };
}
