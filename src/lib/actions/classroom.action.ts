'use server';

import { withAuth, type ActionResult } from '@/lib/server-action';
import { canApproveScores, canManageSchoolData, hasRole } from '@/lib/security/roles';
import { listClassrooms, getClassroomById, createClassroom, updateClassroom, deleteClassroom } from '@/lib/db';
import { classroomSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';
import { logAudit } from '@/lib/audit/log';

const SHORT_LIST_TTL_MS = 60 * 1000;

async function getAssignedClassroomIds(profileId: string) {
  const supabase = await createAdminClient();
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!teacher?.id) return [];

  const { data } = await supabase
    .from('teacher_classrooms')
    .select('classroom_id')
    .eq('teacher_id', teacher.id)
    .in('assignment_role', ['homeroom', 'assistant']);

  return Array.from(new Set((data || []).map((row) => row.classroom_id as string).filter(Boolean)));
}

async function listAssignedClassrooms(classroomIds: string[]) {
  if (classroomIds.length === 0) return [];

  const supabase = await createAdminClient();
  const { data } = await supabase
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
    .in('id', classroomIds)
    .order('grade_level', { ascending: true })
    .order('name', { ascending: true });

  return (data || []).map((classroom: Record<string, unknown>) => ({
    id: classroom.id as string,
    name: classroom.name as string,
    education_stage_id: classroom.education_stage_id as string,
    education_stage_name: ((classroom.education_stages as Record<string, unknown>)?.name_th as string) || '',
    grade_level_id: classroom.grade_level_id as string,
    grade_level_name: ((classroom.grade_levels as Record<string, unknown>)?.name as string) || '',
    grade_level: classroom.grade_level as number,
    academic_year_id: classroom.academic_year_id as string,
    academic_year: ((classroom.academic_years as Record<string, unknown>)?.name as string) || '',
    student_count: 0,
    teacher_count: 0,
    homeroom_teacher_name: '',
    advisor_teacher_name: '',
  }));
}

export async function getClassrooms(params?: {
  education_stage_id?: string;
  grade_level?: number;
  grade_level_id?: string;
  academic_year_id?: string;
}) {
  return withAuth(async (profile) => {
    const canViewAll = canManageSchoolData(profile) || canApproveScores(profile);
    const isTeacher = hasRole(profile, 'teacher');
    if (!canViewAll && !isTeacher) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดูห้องเรียน' } };
    }

    const assignedClassroomIds = canViewAll ? [] : await getAssignedClassroomIds(profile.id);
    if (!canViewAll && assignedClassroomIds.length === 0) {
      return { success: true, data: [] };
    }

    const cacheKey = `classrooms:list:${canViewAll ? 'all' : `teacher:${profile.id}`}:${JSON.stringify(params || {})}`;
    const cached = getTtlCache<Awaited<ReturnType<typeof listClassrooms>>>(cacheKey);
    if (cached) return { success: true, data: cached };

    const result = canViewAll
      ? await listClassrooms(params)
      : (await listAssignedClassrooms(assignedClassroomIds)).filter((classroom) => {
        if (params?.academic_year_id && (classroom as any).academic_year_id !== params.academic_year_id) return false;
        if (params?.education_stage_id && classroom.education_stage_id !== params.education_stage_id) return false;
        if (params?.grade_level_id && classroom.grade_level_id !== params.grade_level_id) return false;
        if (params?.grade_level && classroom.grade_level !== params.grade_level) return false;
        return true;
      });
    setTtlCache(cacheKey, result, SHORT_LIST_TTL_MS);
    return { success: true, data: result };
  });
}

export async function getClassroom(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const classroom = await getClassroomById(id);
    if (!classroom) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบห้องเรียน' } };
    }
    return { success: true, data: classroom };
  });
}

export async function addClassroom(data: {
  education_stage_id: string;
  grade_level_id?: string;
  grade_level?: number;
  room_count?: number;
}) {
  return withAuth(async (profile) => {
    const validated = classroomSchema.parse(data);

    const supabase = await createClient();
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    if (!acYear?.id) {
      return { success: false, error: { code: 'NO_CURRENT_YEAR', message: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' } };
    }

    const { data: gradeLevel } = await supabase
      .from('grade_levels')
      .select('id, education_stage_id, name, level_no')
      .eq('id', validated.grade_level_id || '')
      .eq('education_stage_id', validated.education_stage_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!gradeLevel) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบชั้นปีของระดับนี้' } };
    }

    const roomCount = validated.room_count || 1;
    const classroomNames = Array.from(
      { length: roomCount },
      (_, index) => `${gradeLevel.name}/${index + 1}`,
    );

    const { data: existingClassrooms } = await supabase
      .from('classrooms')
      .select('name')
      .eq('academic_year_id', acYear.id)
      .in('name', classroomNames);

    if (existingClassrooms && existingClassrooms.length > 0) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: `มีห้องเรียนนี้อยู่แล้ว: ${existingClassrooms.map(c => c.name).join(', ')}`,
        },
      };
    }

    const created = [];

    for (let index = 0; index < classroomNames.length; index++) {
      const name = classroomNames[index];
      const xssCheck = validateXSS({ name });
      if (xssCheck) {
        return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
      }

      const result = await createClassroom({
        name,
        education_stage_id: validated.education_stage_id,
        grade_level_id: gradeLevel.id,
        grade_level: gradeLevel.level_no,
        academic_year_id: acYear.id,
      });
      created.push(result);
    }

    clearTtlCacheByPrefix('classrooms:');
    clearTtlCacheByPrefix('classrooms-for-select:');
    await logAudit({
      actorId: profile.id,
      action: 'classroom_create',
      targetType: 'classroom',
      afterData: { created },
      metadata: { room_count: created.length, academic_year_id: acYear.id },
    });
    return { success: true, data: { created } };
  });
}

export async function setClassroomTeacherAssignment(data: {
  classroom_id: string;
  teacher_id: string;
  assignment_role: 'homeroom' | 'assistant';
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const supabase = await createClient();

    await supabase
      .from('teacher_classrooms')
      .delete()
      .eq('classroom_id', data.classroom_id)
      .eq('assignment_role', data.assignment_role);

    const { error } = await supabase
      .from('teacher_classrooms')
      .insert({
        classroom_id: data.classroom_id,
        teacher_id: data.teacher_id,
        assignment_role: data.assignment_role,
        assigned_by: profile.id,
      });

    if (error) {
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }

    clearTtlCacheByPrefix('classrooms:');
    clearTtlCacheByPrefix('classrooms-for-select:');
    await logAudit({
      actorId: profile.id,
      action: 'classroom_teacher_assign',
      targetType: 'classroom',
      targetId: data.classroom_id,
      afterData: data,
    });
    return { success: true, data: null };
  });
}

export async function editClassroom(id: string, data: {
  name?: string;
  education_stage_id?: string;
  grade_level_id?: string;
  grade_level?: number;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const before = await getClassroomById(id);
    await updateClassroom(id, data as any);
    const after = await getClassroomById(id);
    clearTtlCacheByPrefix('classrooms:');
    clearTtlCacheByPrefix('classrooms-for-select:');
    await logAudit({
      actorId: profile.id,
      action: 'classroom_update',
      targetType: 'classroom',
      targetId: id,
      beforeData: before,
      afterData: after,
      metadata: { changed_fields: Object.keys(data) },
    });
    return { success: true, data: { id } };
  });
}

export async function removeClassroom(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    try {
      const before = await getClassroomById(id);
      await deleteClassroom(id);
      clearTtlCacheByPrefix('classrooms:');
      clearTtlCacheByPrefix('classrooms-for-select:');
      await logAudit({
        actorId: profile.id,
        action: 'classroom_delete',
        targetType: 'classroom',
        targetId: id,
        beforeData: before,
      });
      return { success: true, data: { id } };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: err instanceof Error ? err.message : 'ไม่สามารถลบห้องเรียนได้',
        },
      };
    }
  });
}
