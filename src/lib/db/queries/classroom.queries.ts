import { createClient } from '@/lib/supabase/server';
import type { Classroom } from '@/types';

function formatTeacherName(profile?: Record<string, unknown>) {
  const prefix = String(profile?.prefix || '').trim();
  let fullName = String(profile?.full_name || '').trim();
  if (fullName.startsWith('ครู')) {
    fullName = fullName.slice('ครู'.length).trim();
  }
  return prefix && fullName && !fullName.startsWith(prefix) ? `${prefix}${fullName}` : fullName;
}

export interface ClassroomWithDetails extends Classroom {
  student_count?: number;
  teacher_count?: number;
  homeroom_teacher_name?: string;
  advisor_teacher_name?: string;
}

/**
 * List all classrooms
 */
export async function listClassrooms(params: {
  education_stage_id?: string;
  grade_level?: number;
  grade_level_id?: string;
  academic_year_id?: string;
} = {}) {
  const supabase = await createClient();

  let query = supabase
    .from('classrooms')
    .select(`
      id,
      name,
      education_stage_id,
      grade_level_id,
      grade_level,
      academic_year_id,
      academic_years(name),
      education_stages(name_th),
      grade_levels(name, level_no)
    `);

  if (params.education_stage_id) {
    query = query.eq('education_stage_id', params.education_stage_id);
  }
  if (params.grade_level) {
    query = query.eq('grade_level', params.grade_level);
  }
  if (params.grade_level_id) {
    query = query.eq('grade_level_id', params.grade_level_id);
  }
  if (params.academic_year_id) {
    query = query.eq('academic_year_id', params.academic_year_id);
  }

  const { data, error } = await query
    .order('grade_level', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  const classroomIds = (data || []).map((c) => c.id as string);
  const teacherNameById = await getClassroomTeacherNames(classroomIds);

  // Batch fetch student counts (single query instead of N queries)
  const studentCountMap = new Map<string, number>();
  if (classroomIds.length > 0) {
    const { data: studentRows } = await supabase
      .from('students')
      .select('classroom_id')
      .in('classroom_id', classroomIds)
      .eq('current_status', 'active');
    for (const row of (studentRows || [])) {
      const cid = row.classroom_id as string;
      studentCountMap.set(cid, (studentCountMap.get(cid) || 0) + 1);
    }
  }

  // Batch fetch teacher counts (single query instead of N queries)
  const teacherCountMap = new Map<string, number>();
  if (classroomIds.length > 0) {
    const { data: tcRows } = await supabase
      .from('teacher_classrooms')
      .select('classroom_id')
      .in('classroom_id', classroomIds);
    for (const row of (tcRows || [])) {
      const cid = row.classroom_id as string;
      teacherCountMap.set(cid, (teacherCountMap.get(cid) || 0) + 1);
    }
  }

  const classrooms: ClassroomWithDetails[] = [];
  for (const c of (data || [])) {
    const teacherNames = teacherNameById.get(c.id as string);

    classrooms.push({
      id: c.id as string,
      name: c.name as string,
      education_stage_id: c.education_stage_id as string,
      education_stage_name: ((c.education_stages as unknown as Record<string, unknown>)?.name_th as string) || '',
      grade_level_id: c.grade_level_id as string,
      grade_level_name: ((c.grade_levels as unknown as Record<string, unknown>)?.name as string) || '',
      grade_level: c.grade_level as number,
      academic_year: ((c.academic_years as unknown as Record<string, unknown>)?.name as string) || '',
      student_count: studentCountMap.get(c.id as string) || 0,
      teacher_count: teacherCountMap.get(c.id as string) || 0,
      homeroom_teacher_name: teacherNames?.homeroom || '',
      advisor_teacher_name: teacherNames?.advisor || teacherNames?.homeroom || '',
    });
  }

  return classrooms;
}

/**
 * Get classroom by ID
 */
export async function getClassroomById(id: string): Promise<ClassroomWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('classrooms')
    .select(`
      id,
      name,
      education_stage_id,
      grade_level_id,
      grade_level,
      academic_year_id,
      academic_years(name),
      education_stages(name_th),
      grade_levels(name, level_no)
    `)
    .eq('id', id)
    .single();

  if (error) return null;

  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', id)
    .eq('current_status', 'active');

  const { count: teacherCount } = await supabase
    .from('teacher_classrooms')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', id);
  const teacherNames = (await getClassroomTeacherNames([id])).get(id);

  return {
    id: data.id as string,
    name: data.name as string,
    education_stage_id: data.education_stage_id as string,
    education_stage_name: ((data.education_stages as unknown as Record<string, unknown>)?.name_th as string) || '',
    grade_level_id: data.grade_level_id as string,
    grade_level_name: ((data.grade_levels as unknown as Record<string, unknown>)?.name as string) || '',
    grade_level: data.grade_level as number,
    academic_year: ((data.academic_years as unknown as Record<string, unknown>)?.name as string) || '',
    student_count: studentCount || 0,
    teacher_count: teacherCount || 0,
    homeroom_teacher_name: teacherNames?.homeroom || '',
    advisor_teacher_name: teacherNames?.advisor || teacherNames?.homeroom || '',
  };
}

async function getClassroomTeacherNames(classroomIds: string[]) {
  const supabase = await createClient();
  const teacherNamesByClassroom = new Map<string, { homeroom?: string; advisor?: string }>();

  if (classroomIds.length === 0) return teacherNamesByClassroom;

  const { data: assignments } = await supabase
    .from('teacher_classrooms')
    .select('classroom_id, teacher_id, assignment_role')
    .in('classroom_id', classroomIds)
    .in('assignment_role', ['homeroom', 'assistant']);

  const teacherIds = Array.from(new Set((assignments || []).map((a) => a.teacher_id as string).filter(Boolean)));
  if (teacherIds.length === 0) return teacherNamesByClassroom;

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, profiles!inner(full_name, prefix)')
    .in('id', teacherIds);

  const teacherNameByTeacherId = new Map<string, string>();
  for (const teacher of teachers || []) {
    teacherNameByTeacherId.set(
      teacher.id as string,
      formatTeacherName(teacher.profiles as unknown as Record<string, unknown>),
    );
  }

  for (const assignment of assignments || []) {
    const classroomId = assignment.classroom_id as string;
    const role = assignment.assignment_role as string;
    const teacherName = teacherNameByTeacherId.get(assignment.teacher_id as string) || '';
    if (!teacherName) continue;

    const current = teacherNamesByClassroom.get(classroomId) || {};
    if (role === 'homeroom') current.homeroom = teacherName;
    if (role === 'assistant') current.advisor = teacherName;
    teacherNamesByClassroom.set(classroomId, current);
  }

  return teacherNamesByClassroom;
}

/**
 * Create classroom
 */
export async function createClassroom(data: {
  name: string;
  education_stage_id: string;
  grade_level_id?: string;
  grade_level: number;
  academic_year_id: string;
}) {
  const supabase = await createClient();

  const { data: classroom, error } = await supabase
    .from('classrooms')
    .insert({
      name: data.name,
      education_stage_id: data.education_stage_id,
      grade_level_id: data.grade_level_id || null,
      grade_level: data.grade_level,
      academic_year_id: data.academic_year_id,
    })
    .select('id')
    .single();

  if (error) throw error;
  return classroom;
}

/**
 * Update classroom
 */
export async function updateClassroom(id: string, data: Partial<Classroom>) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.education_stage_id) updateData.education_stage_id = data.education_stage_id;
  if (data.grade_level_id) updateData.grade_level_id = data.grade_level_id;
  if (data.grade_level) updateData.grade_level = data.grade_level;

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('classrooms')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  return { success: true };
}

/**
 * Delete classroom
 */
export async function deleteClassroom(id: string) {
  const supabase = await createClient();

  // Check if classroom has students
  const { count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', id);

  if (count && count > 0) {
    throw new Error('ไม่สามารถลบห้องเรียนที่มีนักเรียนอยู่');
  }

  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}
