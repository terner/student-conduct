import { createClient } from '@/lib/supabase/server';
import type { Teacher } from '@/types';

export interface TeacherWithProfile extends Teacher {
  full_name?: string;
  email?: string;
  assigned_classrooms?: {
    classroom_id: string;
    classroom_name: string;
    education_stage_name: string;
    grade_level: number;
    assignment_role: string;
  }[];
}

/**
 * List teachers
 */
export async function listTeachers(params: { search?: string; department?: string } = {}) {
  const supabase = await createClient();

  let query = supabase
    .from('teachers')
    .select(`
      *,
      profiles!inner(full_name, user_id),
      teacher_classrooms(
        classroom_id,
        assignment_role,
        classrooms!inner(name, education_stage_id, grade_level)
      )
    `);

  if (params.department) {
    query = query.eq('department', params.department);
  }

  const { data, error } = await query.order('profiles(full_name)');

  if (error) throw error;

  // Resolve education stage names in batch
  const stageIds = new Set<string>();
  for (const t of (data || [])) {
    for (const tc of (t.teacher_classrooms as Array<Record<string, unknown>> || [])) {
      const stageId = (tc.classrooms as Record<string, unknown>)?.education_stage_id as string;
      if (stageId) stageIds.add(stageId);
    }
  }
  const { data: stages } = stageIds.size > 0
    ? await supabase.from('education_stages').select('id, name_th').in('id', Array.from(stageIds))
    : { data: null };
  const stageNameMap = new Map<string, string>();
  if (stages) {
    for (const s of stages) stageNameMap.set(s.id, s.name_th);
  }

  return (data || []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    profile_id: t.profile_id as string,
    employee_id: t.employee_id as string,
    department: t.department as string | undefined,
    full_name: (t.profiles as Record<string, unknown>)?.full_name as string || '',
    email: '', // Would need auth.users join
    assigned_classrooms: ((t.teacher_classrooms as Array<Record<string, unknown>>) || []).map((tc: Record<string, unknown>) => {
      const classroomData = tc.classrooms as Record<string, unknown> || {};
      return {
        classroom_id: tc.classroom_id as string,
        classroom_name: classroomData.name as string || '',
        education_stage_name: stageNameMap.get(classroomData.education_stage_id as string) || '',
        grade_level: classroomData.grade_level as number || 0,
        assignment_role: tc.assignment_role as string || 'homeroom',
      };
    }),
  })) as TeacherWithProfile[];
}

/**
 * Get teacher by ID with full details
 */
export async function getTeacherById(id: string): Promise<TeacherWithProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('teachers')
    .select(`
      *,
      profiles!inner(full_name, user_id),
      teacher_classrooms(
        classroom_id,
        assignment_role,
        classrooms!inner(name, education_stage_id, grade_level)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  // Resolve stage names
  const stageIds = new Set<string>();
  for (const tc of (data.teacher_classrooms || [])) {
    const stageId = (tc.classrooms as Record<string, unknown>)?.education_stage_id as string;
    if (stageId) stageIds.add(stageId);
  }
  const { data: stages } = stageIds.size > 0
    ? await supabase.from('education_stages').select('id, name_th').in('id', Array.from(stageIds))
    : { data: null };
  const stageNameMap = new Map<string, string>();
  if (stages) {
    for (const s of stages) stageNameMap.set(s.id, s.name_th);
  }

  return {
    id: data.id,
    profile_id: data.profile_id,
    employee_id: data.employee_id,
    department: data.department,
    full_name: data.profiles?.full_name || '',
    email: '',
    assigned_classrooms: (data.teacher_classrooms || []).map((tc: Record<string, unknown>) => {
      const classroomData = tc.classrooms as Record<string, unknown> || {};
      return {
        classroom_id: tc.classroom_id as string,
        classroom_name: classroomData.name as string || '',
        education_stage_name: stageNameMap.get(classroomData.education_stage_id as string) || '',
        grade_level: classroomData.grade_level as number || 0,
        assignment_role: tc.assignment_role as string || 'homeroom',
      };
    }),
  };
}

/**
 * Create teacher with auth user and profile
 */
export async function createTeacher(data: {
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  department?: string;
}) {
  const supabase = await createClient();

  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: 'Teacher@123',
    email_confirm: true,
    user_metadata: { full_name: `${data.first_name} ${data.last_name}`, role: 'teacher' },
  });

  if (authError) throw authError;
  if (!authUser.user) throw new Error('Failed to create auth user');

  // 2. Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: authUser.user.id,
      role: 'teacher',
      full_name: `${data.first_name} ${data.last_name}`,
      is_active: true,
      must_change_password: true,
    })
    .select('id')
    .single();

  if (profileError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw profileError;
  }

  // 3. Create teacher record
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .insert({
      profile_id: profile.id,
      employee_id: data.employee_id,
      department: data.department || null,
    })
    .select('id')
    .single();

  if (teacherError) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw teacherError;
  }

  return teacher;
}

/**
 * Update teacher
 */
export async function updateTeacher(id: string, data: {
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  department?: string;
  is_active?: boolean;
}) {
  const supabase = await createClient();

  const teacher = await supabase
    .from('teachers')
    .select('profile_id')
    .eq('id', id)
    .single();

  if (data.first_name || data.last_name) {
    if (teacher.data?.profile_id) {
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
      if (fullName) {
        await supabase
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', teacher.data.profile_id);
      }
    }
  }

  if (data.is_active !== undefined && teacher.data?.profile_id) {
    await supabase
      .from('profiles')
      .update({ is_active: data.is_active })
      .eq('id', teacher.data.profile_id);
  }

  const updateData: Record<string, unknown> = {};
  if (data.employee_id) updateData.employee_id = data.employee_id;
  if (data.department !== undefined) updateData.department = data.department;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('teachers')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  }

  return { success: true };
}

/**
 * Assign teacher to classroom
 */
export async function assignTeacherToClassroom(data: {
  teacher_id: string;
  classroom_id: string;
  assignment_role?: string;
  assigned_by: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('teacher_classrooms')
    .insert({
      teacher_id: data.teacher_id,
      classroom_id: data.classroom_id,
      assignment_role: data.assignment_role || 'homeroom',
      assigned_by: data.assigned_by,
    });

  if (error) throw error;
  return { success: true };
}

/**
 * Remove teacher from classroom
 */
export async function removeTeacherFromClassroom(teacherId: string, classroomId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('teacher_classrooms')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('classroom_id', classroomId);

  if (error) throw error;
  return { success: true };
}
