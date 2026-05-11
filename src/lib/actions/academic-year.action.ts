'use server';

import { withAuth } from '@/lib/server-action';
import { canManageSchoolData } from '@/lib/security/roles';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';

const MASTER_DATA_TTL_MS = 10 * 60 * 1000;

export interface AcademicYearItem {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  base_score: number;
}

export async function getAcademicYears(options: { bypassCache?: boolean } = {}) {
  return withAuth(async () => {
    const cacheKey = 'academic-years:all';
    const cached = options.bypassCache ? undefined : await getTtlCache<AcademicYearItem[]>(cacheKey);
    if (cached) return { success: true, data: cached };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('academic_years')
      .select('id, name, start_date, end_date, is_current, base_score')
      .order('name', { ascending: false });

    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };

    const years = (data || []).map((year) => ({
      id: year.id as string,
      name: year.name as string,
      start_date: (year.start_date as string | null) || null,
      end_date: (year.end_date as string | null) || null,
      is_current: Boolean(year.is_current),
      base_score: (year.base_score as number | null) || 100,
    }));

    await setTtlCache(cacheKey, years, MASTER_DATA_TTL_MS);
    return { success: true, data: years };
  });
}

export async function addAcademicYear(input: {
  name: string;
  start_date?: string;
  end_date?: string;
  base_score?: number;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const name = input.name.trim();
    if (!name) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'กรุณากรอกปีการศึกษา' } };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('academic_years').insert({
      name,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      base_score: input.base_score || 100,
      is_current: false,
    });

    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    await clearTtlCacheByPrefix('academic-years:');
    return { success: true, data: null };
  });
}

export async function updateAcademicYear(id: string, input: {
  name: string;
  start_date?: string;
  end_date?: string;
  base_score?: number;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const name = input.name.trim();
    if (!name) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'กรุณากรอกปีการศึกษา' } };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('academic_years')
      .update({
        name,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        base_score: input.base_score || 100,
      })
      .eq('id', id);

    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    await clearTtlCacheByPrefix('academic-years:');
    return { success: true, data: null };
  });
}

function nextAcademicYearName(name: string) {
  const numeric = Number(name);
  if (Number.isInteger(numeric)) return String(numeric + 1);
  return `${name} ใหม่`;
}

function addOneYear(date: string | null) {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
  return parsed.toISOString().slice(0, 10);
}

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

function classroomKey(classroom: {
  name?: string | null;
  grade_level?: number | null;
  grade_level_id?: string | null;
}) {
  return [
    classroom.name || '',
    classroom.grade_level ?? '',
    classroom.grade_level_id || '',
  ].join('|');
}

export async function createNextAcademicYearFromCurrent() {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const supabase = await createAdminClient();
    const { data: sourceYear, error: sourceError } = await supabase
      .from('academic_years')
      .select('id, name, start_date, end_date, base_score')
      .eq('is_current', true)
      .maybeSingle();

    if (sourceError) return { success: false, error: { code: 'DB_ERROR', message: sourceError.message } };
    if (!sourceYear?.id) {
      return { success: false, error: { code: 'NO_CURRENT_YEAR', message: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' } };
    }

    if (!sourceYear.end_date) {
      return { success: false, error: { code: 'MISSING_END_DATE', message: 'ยังไม่ได้กำหนดวันที่สิ้นสุดของปีการศึกษาปัจจุบัน' } };
    }

    const today = todayInBangkok();
    if (today <= sourceYear.end_date) {
      return {
        success: false,
        error: {
          code: 'CURRENT_YEAR_NOT_ENDED',
          message: `ยังไม่สามารถขึ้นปีการศึกษาใหม่ได้ ปี ${sourceYear.name} จะสิ้นสุดวันที่ ${sourceYear.end_date}`,
        },
      };
    }

    const nextName = nextAcademicYearName(String(sourceYear.name));
    const targetYearResult = await supabase
      .from('academic_years')
      .select('id, name')
      .eq('name', nextName)
      .maybeSingle();
    let targetYear = targetYearResult.data;
    const targetError = targetYearResult.error;

    if (targetError) return { success: false, error: { code: 'DB_ERROR', message: targetError.message } };

    let createdYear = false;
    if (!targetYear?.id) {
      const { data: insertedYear, error: insertYearError } = await supabase
        .from('academic_years')
        .insert({
          name: nextName,
          start_date: addOneYear((sourceYear.start_date as string | null) || null),
          end_date: addOneYear((sourceYear.end_date as string | null) || null),
          base_score: (sourceYear.base_score as number | null) || 100,
          is_current: false,
        })
        .select('id, name')
        .single();

      if (insertYearError) return { success: false, error: { code: 'DB_ERROR', message: insertYearError.message } };
      targetYear = insertedYear;
      createdYear = true;
    }

    const targetYearId = targetYear.id as string;

    const { data: sourceClassrooms, error: sourceClassroomError } = await supabase
      .from('classrooms')
      .select('id, name, grade_level, education_stage_id, grade_level_id')
      .eq('academic_year_id', sourceYear.id);
    if (sourceClassroomError) return { success: false, error: { code: 'DB_ERROR', message: sourceClassroomError.message } };

    const { data: targetClassrooms, error: targetClassroomError } = await supabase
      .from('classrooms')
      .select('id, name, grade_level, education_stage_id, grade_level_id')
      .eq('academic_year_id', targetYearId);
    if (targetClassroomError) return { success: false, error: { code: 'DB_ERROR', message: targetClassroomError.message } };

    const targetByKey = new Map((targetClassrooms || []).map((classroom) => [classroomKey(classroom), classroom]));
    const missingClassrooms = (sourceClassrooms || [])
      .filter((classroom) => !targetByKey.has(classroomKey(classroom)))
      .map((classroom) => ({
        name: classroom.name,
        grade_level: classroom.grade_level,
        education_stage_id: classroom.education_stage_id,
        grade_level_id: classroom.grade_level_id,
        academic_year_id: targetYearId,
      }));

    let createdClassrooms = 0;
    if (missingClassrooms.length > 0) {
      const { error: insertClassroomError } = await supabase
        .from('classrooms')
        .insert(missingClassrooms);
      if (insertClassroomError) return { success: false, error: { code: 'DB_ERROR', message: insertClassroomError.message } };
      createdClassrooms = missingClassrooms.length;
    }

    const { data: refreshedTargetClassrooms, error: refreshClassroomError } = await supabase
      .from('classrooms')
      .select('id, name, grade_level, education_stage_id, grade_level_id')
      .eq('academic_year_id', targetYearId);
    if (refreshClassroomError) return { success: false, error: { code: 'DB_ERROR', message: refreshClassroomError.message } };

    const refreshedTargetByKey = new Map((refreshedTargetClassrooms || []).map((classroom) => [classroomKey(classroom), classroom]));
    const sourceToTargetClassroomId = new Map<string, string>();
    for (const sourceClassroom of sourceClassrooms || []) {
      const targetClassroom = refreshedTargetByKey.get(classroomKey(sourceClassroom));
      if (targetClassroom?.id) sourceToTargetClassroomId.set(sourceClassroom.id as string, targetClassroom.id as string);
    }

    const sourceClassroomIds = Array.from(sourceToTargetClassroomId.keys());
    let createdAssignments = 0;
    if (sourceClassroomIds.length > 0) {
      const { data: sourceAssignments, error: assignmentError } = await supabase
        .from('teacher_classrooms')
        .select('teacher_id, classroom_id, assignment_role, assigned_by')
        .in('classroom_id', sourceClassroomIds);
      if (assignmentError) return { success: false, error: { code: 'DB_ERROR', message: assignmentError.message } };

      const targetClassroomIds = Array.from(sourceToTargetClassroomId.values());
      const { data: targetAssignments, error: targetAssignmentError } = await supabase
        .from('teacher_classrooms')
        .select('teacher_id, classroom_id, assignment_role')
        .in('classroom_id', targetClassroomIds);
      if (targetAssignmentError) return { success: false, error: { code: 'DB_ERROR', message: targetAssignmentError.message } };

      const existingAssignments = new Set((targetAssignments || []).map((assignment) => [
        assignment.teacher_id,
        assignment.classroom_id,
        assignment.assignment_role,
      ].join('|')));

      const assignmentsToInsert = (sourceAssignments || [])
        .map((assignment) => ({
          teacher_id: assignment.teacher_id,
          classroom_id: sourceToTargetClassroomId.get(assignment.classroom_id as string),
          assignment_role: assignment.assignment_role,
          assigned_by: assignment.assigned_by,
        }))
        .filter((assignment) => (
          assignment.classroom_id &&
          !existingAssignments.has([assignment.teacher_id, assignment.classroom_id, assignment.assignment_role].join('|'))
        ));

      if (assignmentsToInsert.length > 0) {
        const { error: insertAssignmentError } = await supabase
          .from('teacher_classrooms')
          .insert(assignmentsToInsert);
        if (insertAssignmentError) return { success: false, error: { code: 'DB_ERROR', message: insertAssignmentError.message } };
        createdAssignments = assignmentsToInsert.length;
      }
    }

    const { error: activateError } = await supabase
      .from('academic_years')
      .update({ is_current: true })
      .eq('id', targetYearId);
    if (activateError) return { success: false, error: { code: 'DB_ERROR', message: activateError.message } };

    const { error: deactivateError } = await supabase
      .from('academic_years')
      .update({ is_current: false })
      .neq('id', targetYearId);
    if (deactivateError) return { success: false, error: { code: 'DB_ERROR', message: deactivateError.message } };

    await clearTtlCacheByPrefix('academic-years:');
    await clearTtlCacheByPrefix('classrooms:');
    await clearTtlCacheByPrefix('classrooms-for-select:');
    await clearTtlCacheByPrefix('students-for-select:');

    return {
      success: true,
      data: {
        academic_year_id: targetYearId,
        academic_year_name: targetYear.name as string,
        created_year: createdYear,
        created_classrooms: createdClassrooms,
        created_assignments: createdAssignments,
        activated_current: true,
      },
    };
  });
}
