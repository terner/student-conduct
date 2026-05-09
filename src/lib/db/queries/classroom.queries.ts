import { createClient } from '@/lib/supabase/server';
import type { Classroom } from '@/types';

export interface ClassroomWithDetails extends Classroom {
  student_count?: number;
  teacher_count?: number;
}

/**
 * List all classrooms
 */
export async function listClassrooms(params: {
  education_stage_id?: string;
  grade_level?: number;
  academic_year_id?: string;
} = {}) {
  const supabase = await createClient();

  let query = supabase
    .from('classrooms')
    .select(`
      id,
      name,
      education_stage_id,
      grade_level,
      academic_year_id,
      academic_years(name),
      education_stages(name_th)
    `);

  if (params.education_stage_id) {
    query = query.eq('education_stage_id', params.education_stage_id);
  }
  if (params.grade_level) {
    query = query.eq('grade_level', params.grade_level);
  }
  if (params.academic_year_id) {
    query = query.eq('academic_year_id', params.academic_year_id);
  }

  const { data, error } = await query
    .order('grade_level', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  const classrooms: ClassroomWithDetails[] = [];
  for (const c of (data || [])) {
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', c.id as string)
      .eq('current_status', 'active');

    const { count: teacherCount } = await supabase
      .from('teacher_classrooms')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', c.id as string);

    classrooms.push({
      id: c.id as string,
      name: c.name as string,
      education_stage_id: c.education_stage_id as string,
      education_stage_name: ((c.education_stages as unknown as Record<string, unknown>)?.name_th as string) || '',
      grade_level: c.grade_level as number,
      academic_year: ((c.academic_years as unknown as Record<string, unknown>)?.name as string) || '',
      student_count: studentCount || 0,
      teacher_count: teacherCount || 0,
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
      grade_level,
      academic_year_id,
      academic_years(name),
      education_stages(name_th)
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

  return {
    id: data.id as string,
    name: data.name as string,
    education_stage_id: data.education_stage_id as string,
    education_stage_name: ((data.education_stages as unknown as Record<string, unknown>)?.name_th as string) || '',
    grade_level: data.grade_level as number,
    academic_year: ((data.academic_years as unknown as Record<string, unknown>)?.name as string) || '',
    student_count: studentCount || 0,
    teacher_count: teacherCount || 0,
  };
}

/**
 * Create classroom
 */
export async function createClassroom(data: {
  name: string;
  education_stage_id: string;
  grade_level: number;
  academic_year_id: string;
}) {
  const supabase = await createClient();

  const { data: classroom, error } = await supabase
    .from('classrooms')
    .insert({
      name: data.name,
      education_stage_id: data.education_stage_id,
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
