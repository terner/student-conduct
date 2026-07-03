'use server';

import { withAuth, type ActionResult } from '@/lib/server-action';
import { canApproveScores, canManageSchoolData, hasRole } from '@/lib/security/roles';
import { listClassrooms, getClassroomById, createClassroom, updateClassroom, deleteClassroom } from '@/lib/db';
import { classroomSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';
import { logAudit } from '@/lib/audit/log';
import { serverMessage } from '@/lib/i18n/server';

const SHORT_LIST_TTL_MS = 60 * 1000;

function todayInBangkok() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

async function getAcademicYearClosedReason(year: {
  start_date?: string | null;
  end_date?: string | null;
}, today = todayInBangkok()) {
  if (year.start_date && today < year.start_date) {
    return serverMessage('apiErrors.academicYearNotStarted', { date: year.start_date });
  }
  if (year.end_date && today > year.end_date) {
    return serverMessage('apiErrors.academicYearEnded', { date: year.end_date });
  }
  return '';
}

async function ensureCurrentAcademicYearOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { data: acYear, error } = await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date')
    .eq('is_current', true)
    .maybeSingle();

  if (error) throw error;
  if (!acYear?.id) {
    return { success: false as const, error: { code: 'NO_CURRENT_YEAR', message: await serverMessage('apiErrors.noCurrentAcademicYear') } };
  }

  const closedReason = await getAcademicYearClosedReason(acYear);
  if (closedReason) {
    return {
      success: false as const,
      error: { code: 'ACADEMIC_YEAR_CLOSED', message: await serverMessage('apiErrors.classroomEditClosedAcademicYear', { reason: closedReason }) },
    };
  }

  return { success: true as const, academicYear: acYear };
}

async function ensureClassroomEditableInCurrentYear(
  supabase: Awaited<ReturnType<typeof createClient>>,
  classroomId: string,
) {
  const currentYearResult = await ensureCurrentAcademicYearOpen(supabase);
  if (!currentYearResult.success) return currentYearResult;

  const { data: classroom, error } = await supabase
    .from('classrooms')
    .select('academic_year_id')
    .eq('id', classroomId)
    .maybeSingle();

  if (error) throw error;
  if (!classroom) {
    return { success: false as const, error: { code: 'NOT_FOUND', message: await serverMessage('apiErrors.classroomNotFound') } };
  }
  if (classroom.academic_year_id !== currentYearResult.academicYear.id) {
    return { success: false as const, error: { code: 'ACADEMIC_YEAR_NOT_CURRENT', message: await serverMessage('apiErrors.classroomEditCurrentYearOnly') } };
  }

  return { success: true as const, academicYear: currentYearResult.academicYear };
}

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
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.classroomViewForbidden') } };
    }

    const assignedClassroomIds = canViewAll ? [] : await getAssignedClassroomIds(profile.id);
    if (!canViewAll && assignedClassroomIds.length === 0) {
      return { success: true, data: [] };
    }

    const cacheKey = `classrooms:list:${canViewAll ? 'all' : `teacher:${profile.id}`}:${JSON.stringify(params || {})}`;
    const cached = await getTtlCache<Awaited<ReturnType<typeof listClassrooms>>>(cacheKey);
    if (cached) return { success: true, data: cached };

    const result = canViewAll
      ? await listClassrooms(params)
      : (await listAssignedClassrooms(assignedClassroomIds)).filter((classroom) => {
        if (params?.academic_year_id && classroom.academic_year_id !== params.academic_year_id) return false;
        if (params?.education_stage_id && classroom.education_stage_id !== params.education_stage_id) return false;
        if (params?.grade_level_id && classroom.grade_level_id !== params.grade_level_id) return false;
        if (params?.grade_level && classroom.grade_level !== params.grade_level) return false;
        return true;
      });
    await setTtlCache(cacheKey, result, SHORT_LIST_TTL_MS);
    return { success: true, data: result };
  });
}

export async function getClassroom(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const classroom = await getClassroomById(id);
    if (!classroom) {
      return { success: false, error: { code: 'NOT_FOUND', message: await serverMessage('apiErrors.classroomNotFound') } };
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
    const currentYearResult = await ensureCurrentAcademicYearOpen(supabase);
    if (!currentYearResult.success) return currentYearResult;
    const acYear = currentYearResult.academicYear;

    const { data: gradeLevel } = await supabase
      .from('grade_levels')
      .select('id, education_stage_id, name, level_no')
      .eq('id', validated.grade_level_id || '')
      .eq('education_stage_id', validated.education_stage_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!gradeLevel) {
      return { success: false, error: { code: 'NOT_FOUND', message: await serverMessage('apiErrors.gradeLevelNotFound') } };
    }

    const roomCount = validated.name ? 1 : (validated.room_count || 1);
    const classroomNames = validated.name
      ? [validated.name]
      : Array.from(
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
          message: await serverMessage('apiErrors.classroomAlreadyExists', { names: existingClassrooms.map(c => c.name).join(', ') }),
        },
      };
    }

    const created = [];

    for (let index = 0; index < classroomNames.length; index++) {
      const name = classroomNames[index];
      const xssCheck = validateXSS({ name });
      if (xssCheck) {
        return { success: false, error: { code: 'XSS_DETECTED', message: await serverMessage('apiErrors.xssDetected') } };
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

    await clearTtlCacheByPrefix('classrooms:');
    await clearTtlCacheByPrefix('classrooms-for-select:');
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
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createClient();
    const editableYear = await ensureClassroomEditableInCurrentYear(supabase, data.classroom_id);
    if (!editableYear.success) return editableYear;

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

    await clearTtlCacheByPrefix('classrooms:');
    await clearTtlCacheByPrefix('classrooms-for-select:');
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
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const supabase = await createClient();
    const editableYear = await ensureClassroomEditableInCurrentYear(supabase, id);
    if (!editableYear.success) return editableYear;

    const before = await getClassroomById(id);
    await updateClassroom(id, data);
    const after = await getClassroomById(id);
    await clearTtlCacheByPrefix('classrooms:');
    await clearTtlCacheByPrefix('classrooms-for-select:');
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
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    try {
      const supabase = await createClient();
      const editableYear = await ensureClassroomEditableInCurrentYear(supabase, id);
      if (!editableYear.success) return editableYear;

      const before = await getClassroomById(id);
      await deleteClassroom(id);
      await clearTtlCacheByPrefix('classrooms:');
      await clearTtlCacheByPrefix('classrooms-for-select:');
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
          message: err instanceof Error ? err.message : await serverMessage('apiErrors.classroomDeleteFailed'),
        },
      };
    }
  });
}
