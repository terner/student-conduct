'use server';

import { withAuth } from '@/lib/server-action';
import { canApproveScores, canImportData, canManageSchoolData, canRecordScores } from '@/lib/security/roles';
import { listStudents, getStudentById, createStudent, updateStudent, archiveStudent, getStudentScoreSummary, getStudentEnrollments, getClassroomTeacherNames, upsertPrimaryGuardian } from '@/lib/db';
import { studentSchema, paginationSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';
import { logAudit } from '@/lib/audit/log';

const MASTER_DATA_TTL_MS = 10 * 60 * 1000;
const SHORT_LIST_TTL_MS = 60 * 1000;

interface ClassroomForSelect {
  id: string;
  name: string;
  grade_level_id: string;
  grade_level_name: string;
  grade_level: number;
  education_stage_id: string;
  academic_year_id: string;
}

interface AcademicYearForSelect {
  id: string;
  name: string;
  is_current: boolean;
  base_score: number;
}

interface StudentForSelect {
  id: string;
  student_id_number: string;
  full_name: string;
  classroom_name: string;
  grade_level_id: string;
  grade_level_name: string;
  grade_level: number;
  education_stage_id: string;
}

interface StudentExportRow {
  academic_year: string;
  student_id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  grade_level: number;
  classroom: string;
  class_number: number | '';
  education_stage: string;
  status: string;
  guardian_full_name: string;
  guardian_relation: string;
  guardian_phone: string;
}

function formatProfileFullName(profile: Record<string, unknown> | null | undefined) {
  const prefix = ((profile?.prefix as string) || '').trim();
  const fullName = ((profile?.full_name as string) || '').trim();
  if (!prefix) return fullName;
  return fullName.startsWith(prefix) ? fullName : `${prefix}${fullName}`;
}

function buildStudentLoginEmail(studentIdNumber: string, academicYearName: string) {
  const yearSegment = academicYearName.trim().replace(/[^0-9A-Za-zก-๙_-]/g, '');
  return `${studentIdNumber}.${yearSegment}@student.school.com`;
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

function getAcademicYearClosedReason(year: {
  start_date?: string | null;
  end_date?: string | null;
}, today = todayInBangkok()) {
  if (year.start_date && today < year.start_date) {
    return `ยังไม่ถึงช่วงปีการศึกษา เริ่มวันที่ ${year.start_date}`;
  }
  if (year.end_date && today > year.end_date) {
    return `พ้นช่วงปีการศึกษาแล้ว สิ้นสุดวันที่ ${year.end_date}`;
  }
  return '';
}

async function canEditStudentProfile(profile: { id: string; role?: string | string[] | null }, studentId: string) {
  if (canManageSchoolData(profile) || canApproveScores(profile)) return true;

  const role = Array.isArray(profile.role) ? profile.role : [profile.role];
  if (!role.includes('teacher')) return false;

  const adminClient = await createAdminClient();
  const { data: student } = await adminClient
    .from('students')
    .select('classroom_id')
    .eq('id', studentId)
    .maybeSingle();

  if (!student?.classroom_id) return false;

  const { data: teacher } = await adminClient
    .from('teachers')
    .select('id')
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (!teacher?.id) return false;

  const { data: assignment } = await adminClient
    .from('teacher_classrooms')
    .select('teacher_id')
    .eq('teacher_id', teacher.id)
    .eq('classroom_id', student.classroom_id)
    .in('assignment_role', ['homeroom', 'assistant'])
    .maybeSingle();

  return !!assignment;
}

async function canViewStudentProfile(profile: { id: string; role?: string | string[] | null }, studentId: string) {
  if (canManageSchoolData(profile) || canApproveScores(profile) || canRecordScores(profile)) return true;

  const adminClient = await createAdminClient();
  const { data: enrollment } = await adminClient
    .from('student_enrollments')
    .select('id, students!inner(profile_id), academic_years!inner(is_current)')
    .eq('student_id', studentId)
    .eq('students.profile_id', profile.id)
    .eq('academic_years.is_current', true)
    .maybeSingle();

  return Boolean(enrollment);
}

async function ensureStudentEditableInOpenAcademicYear(
  studentId: string,
  classroomId?: string,
) {
  const adminClient = await createAdminClient();
  const { data: currentYear, error: currentYearError } = await adminClient
    .from('academic_years')
    .select('id, name, start_date, end_date')
    .eq('is_current', true)
    .maybeSingle();

  if (currentYearError) throw currentYearError;
  if (!currentYear?.id) {
    return { success: false as const, message: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' };
  }

  if (classroomId) {
    const { data: classroom } = await adminClient
      .from('classrooms')
      .select('academic_year_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (classroom?.academic_year_id !== currentYear.id) {
      return { success: false as const, message: 'ห้องเรียนนี้ไม่อยู่ในปีการศึกษาปัจจุบัน' };
    }
  }

  const { data: enrollment, error } = await adminClient
    .from('student_enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('academic_year_id', currentYear.id)
    .maybeSingle();

  if (error) throw error;
  if (!enrollment) {
    return { success: false as const, message: 'นักเรียนนี้ไม่อยู่ในปีการศึกษาปัจจุบัน' };
  }

  const closedReason = getAcademicYearClosedReason(currentYear);
  if (closedReason) {
    return {
      success: false as const,
      message: `ไม่สามารถแก้ไขข้อมูลนักเรียนของปี ${currentYear.name || ''} ได้ (${closedReason})`,
    };
  }

  return { success: true as const };
}

export async function getStudents(params: {
  page?: number;
  page_size?: number;
  search?: string;
  classroom_id?: string;
  grade_level_id?: string;
  grade_level?: number | string;
  education_stage_id?: string;
  status?: string;
  academic_year?: string;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile) && !canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดูรายชื่อนักเรียน' } };
    }

    const validated = paginationSchema.parse(params);
    const result = await listStudents({
      ...validated,
      grade_level: validated.grade_level === '' ? undefined : validated.grade_level,
    });
    return { success: true, data: result };
  });
}

export async function getStudentsForCsvExport(params: {
  search?: string;
  classroom_id?: string;
  grade_level_id?: string;
  grade_level?: number | string;
  education_stage_id?: string;
  status?: string;
  academic_year?: string;
}) {
  return withAuth<StudentExportRow[]>(async (profile) => {
    if (!canManageSchoolData(profile) && !canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ส่งออกข้อมูลนักเรียน' } };
    }

    const adminClient = await createAdminClient();
    const academicYearId = params.academic_year;
    if (!academicYearId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'กรุณาเลือกปีการศึกษา' } };
    }

    let query = adminClient
      .from('student_enrollments')
      .select(`
        class_number,
        enrollment_status,
        academic_years!inner(id, name),
        students!inner(
          id,
          student_id_number,
          current_status,
          profiles!inner(full_name, prefix),
          classrooms!inner(
            id,
            name,
            grade_level,
            grade_level_id,
            education_stage_id,
            grade_levels(name, level_no),
            education_stages(code, name_th)
          )
        )
      `)
      .eq('academic_year_id', academicYearId);

    if (params.classroom_id) query = query.eq('classroom_id', params.classroom_id);
    if (params.status) query = query.eq('enrollment_status', params.status);
    const { data, error } = await query.order('class_number', { ascending: true });
    if (error) {
      return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    }

    const rows = (data || [])
      .map((enrollment: Record<string, unknown>) => {
        const student = enrollment.students as Record<string, unknown> | null;
        const classroom = student?.classrooms as Record<string, unknown> | null;
        if (!student || !classroom) return null;
        if (params.grade_level && String(classroom.grade_level || '') !== String(params.grade_level)) return null;
        if (params.grade_level_id && classroom.grade_level_id !== params.grade_level_id) return null;
        if (params.education_stage_id && classroom.education_stage_id !== params.education_stage_id) return null;
        return { enrollment, student, classroom };
      })
      .filter((row): row is {
        enrollment: Record<string, unknown>;
        student: Record<string, unknown>;
        classroom: Record<string, unknown>;
      } => Boolean(row));

    const studentIds = rows.map((row) => row.student.id as string);
    const guardianByStudentId = new Map<string, { full_name: string; relation: string; phone: string }>();
    if (studentIds.length > 0) {
      const { data: guardians } = await adminClient
        .from('student_guardians')
        .select('student_id, relation, is_primary, guardians(full_name, phone)')
        .in('student_id', studentIds)
        .order('is_primary', { ascending: false });

      for (const guardianRow of guardians || []) {
        const studentId = guardianRow.student_id as string;
        if (guardianByStudentId.has(studentId)) continue;
        const guardianValue = guardianRow.guardians as unknown;
        const guardian = (Array.isArray(guardianValue) ? guardianValue[0] : guardianValue) as Record<string, unknown> | null;
        guardianByStudentId.set(studentId, {
          full_name: (guardian?.full_name as string) || '',
          relation: (guardianRow.relation as string) || '',
          phone: (guardian?.phone as string) || '',
        });
      }
    }

    let exportRows: StudentExportRow[] = rows
      .sort((a, b) => {
        const classA = String(a.classroom.name || '');
        const classB = String(b.classroom.name || '');
        if (classA !== classB) return classA.localeCompare(classB, 'th');
        return Number(a.enrollment.class_number || 9999) - Number(b.enrollment.class_number || 9999);
      })
      .map(({ enrollment, student, classroom }) => {
        const { prefix, first_name, last_name } = (() => {
          const profile = student.profiles as Record<string, unknown> | null;
          const parsed = profile ? formatProfileFullName(profile) : '';
          const profilePrefix = ((profile?.prefix as string) || '').trim();
          const nameWithoutPrefix = profilePrefix && parsed.startsWith(profilePrefix)
            ? parsed.slice(profilePrefix.length).trim()
            : parsed;
          const spaceIdx = nameWithoutPrefix.indexOf(' ');
          return {
            prefix: profilePrefix,
            first_name: spaceIdx > 0 ? nameWithoutPrefix.slice(0, spaceIdx).trim() : nameWithoutPrefix,
            last_name: spaceIdx > 0 ? nameWithoutPrefix.slice(spaceIdx + 1).trim() : '',
          };
        })();
        const year = enrollment.academic_years as Record<string, unknown> | null;
        const stage = classroom.education_stages as Record<string, unknown> | null;
        const guardian = guardianByStudentId.get(student.id as string);
        const classNumber = enrollment.class_number;
        return {
          academic_year: (year?.name as string) || '',
          student_id: (student.student_id_number as string) || '',
          prefix,
          first_name,
          last_name,
          grade_level: (classroom.grade_level as number) || 0,
          classroom: (classroom.name as string) || '',
          class_number: typeof classNumber === 'number' ? classNumber : '',
          education_stage: (stage?.code as string) || (stage?.name_th as string) || '',
          status: (enrollment.enrollment_status as string) || (student.current_status as string) || 'active',
          guardian_full_name: guardian?.full_name || '',
          guardian_relation: guardian?.relation || '',
          guardian_phone: guardian?.phone || '',
        };
      });

    if (params.search) {
      const search = params.search.trim().toLowerCase();
      exportRows = exportRows.filter((row) => (
        row.student_id.toLowerCase().includes(search)
        || `${row.prefix}${row.first_name} ${row.last_name}`.toLowerCase().includes(search)
      ));
    }

    return { success: true, data: exportRows };
  });
}

export async function getStudent(id: string) {
  return withAuth(async (profile) => {
    const canView = await canViewStudentProfile(profile, id);
    if (!canView) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดูข้อมูลนักเรียนนี้' } };
    }

    const student = await getStudentById(id);
    if (!student) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลนักเรียน' } };
    }
    return { success: true, data: student };
  });
}

export async function addStudent(data: {
  prefix?: string;
  first_name: string;
  last_name: string;
  student_id_number: string;
  classroom_id: string;
  class_number?: number;
  avatar_url?: string;
  guardian_full_name?: string;
  guardian_relation?: string;
  guardian_phone?: string;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    // Validate
    const validated = studentSchema.parse(data);

    // XSS check
    const xssCheck = validateXSS({
      first_name: validated.first_name,
      last_name: validated.last_name,
      guardian_full_name: validated.guardian_full_name || '',
      guardian_phone: validated.guardian_phone || '',
    });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    // Add students only to the current academic year.
    const supabase = await createClient();
    const { data: currentAcademicYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    if (!currentAcademicYear?.id) {
      return { success: false, error: { code: 'NO_CURRENT_YEAR', message: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' } };
    }

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', validated.classroom_id)
      .eq('academic_year_id', currentAcademicYear.id)
      .maybeSingle();

    if (!classroom) {
      return { success: false, error: { code: 'INVALID_CLASSROOM_YEAR', message: 'ห้องเรียนนี้ไม่อยู่ในปีการศึกษาปัจจุบัน' } };
    }

    const result = await createStudent({
      prefix: validated.prefix,
      first_name: validated.first_name,
      last_name: validated.last_name,
      student_id_number: validated.student_id_number,
      classroom_id: validated.classroom_id,
      class_number: validated.class_number,
      academic_year_id: currentAcademicYear.id,
      avatar_url: data.avatar_url,
      guardian_full_name: validated.guardian_full_name,
      guardian_relation: validated.guardian_relation,
      guardian_phone: validated.guardian_phone,
    });

    clearTtlCacheByPrefix('students-for-select:');
    await logAudit({
      actorId: profile.id,
      action: 'student_create',
      targetType: 'student',
      targetId: result.id,
      afterData: result,
      metadata: { classroom_id: validated.classroom_id, academic_year_id: currentAcademicYear.id },
    });
    return { success: true, data: result };
  });
}

export async function editStudent(id: string, data: {
  prefix?: string;
  first_name?: string;
  last_name?: string;
  student_id_number?: string;
  classroom_id?: string;
  current_status?: string;
  class_number?: number;
  avatar_url?: string;
  guardian_full_name?: string;
  guardian_relation?: string;
  guardian_phone?: string;
}) {
  return withAuth(async (profile) => {
    if (data.current_status !== undefined && !canApproveScores(profile) && !canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนสถานะนักเรียนได้' } };
    }

    if (!(await canEditStudentProfile(profile, id))) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด หรือครูประจำชั้น/ครูที่ปรึกษา' } };
    }

    const xssCheck = validateXSS({ ...data });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    const editableYear = await ensureStudentEditableInOpenAcademicYear(id, data.classroom_id);
    if (!editableYear.success) {
      return { success: false, error: { code: 'ACADEMIC_YEAR_CLOSED', message: editableYear.message } };
    }

    const before = await getStudentById(id);
    await updateStudent(id, data);
    const after = await getStudentById(id);
    clearTtlCacheByPrefix('students-for-select:');
    await logAudit({
      actorId: profile.id,
      action: data.current_status !== undefined ? 'student_status_update' : 'student_update',
      targetType: 'student',
      targetId: id,
      beforeData: before,
      afterData: after,
      metadata: { changed_fields: Object.keys(data) },
    });
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

export async function getClassroomsForSelect(academicYearId?: string) {
  return withAuth(async (profile) => {
    if (!canRecordScores(profile) && !canImportData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดูห้องเรียน' } };
    }

    const cacheKey = `classrooms-for-select:${academicYearId || 'all'}`;
    const cached = getTtlCache<ClassroomForSelect[]>(cacheKey);
    if (cached) return { success: true, data: cached };

    const supabase = await createAdminClient();
    async function loadClassrooms(yearId?: string) {
      let query = supabase
        .from('classrooms')
        .select('id, name, grade_level_id, grade_level, education_stage_id, academic_year_id, grade_levels(name, level_no)')
        .order('grade_level')
        .order('name');

      if (yearId) {
        query = query.eq('academic_year_id', yearId);
      }

      const { data: rows } = await query;
      return rows || [];
    }

    let data = await loadClassrooms(academicYearId);
    if (academicYearId && data.length === 0) {
      data = await loadClassrooms();
    }

    const classrooms: ClassroomForSelect[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      grade_level_id: row.grade_level_id as string || '',
      grade_level_name: ((row.grade_levels as Record<string, unknown>)?.name as string) || '',
      grade_level: row.grade_level as number,
      education_stage_id: row.education_stage_id as string,
      academic_year_id: row.academic_year_id as string,
    }));
    setTtlCache(cacheKey, classrooms, SHORT_LIST_TTL_MS);
    return { success: true, data: classrooms };
  });
}

export async function getAcademicYears() {
  return withAuth(async () => {
    const cached = getTtlCache<AcademicYearForSelect[]>('academic-years:all');
    if (cached) return { success: true, data: cached };

    const supabase = await createClient();
    const { data } = await supabase
      .from('academic_years')
      .select('id, name, is_current, base_score')
      .order('name', { ascending: false });
    const years = (data || []) as AcademicYearForSelect[];
    setTtlCache('academic-years:all', years, MASTER_DATA_TTL_MS);
    return { success: true, data: years };
  });
}

export async function getStudentDashboard() {
  return withAuth(async (profile) => {
    const supabase = await createClient();

    // Get current academic year
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id, base_score')
      .eq('is_current', true)
      .single();
    const baseScore = acYear?.base_score || 100;

    // Get student record linked to this profile
    const { data: student } = await supabase
      .from('students')
      .select('id, student_id_number, classroom_id, profiles!inner(full_name, prefix), classrooms!inner(id, name, grade_level, education_stage_id)')
      .eq('profile_id', profile.id)
      .single();

    if (!student) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลนักเรียน' } };
    }

    // Get score transactions
    const { data: scores } = await supabase
      .from('score_transactions')
      .select('id, points, status, recorded_at, note, category_name_at_record, category_type_at_record, score_categories(name, type), profiles!score_transactions_recorded_by_fkey(full_name)')
      .eq('student_id', student.id)
      .eq('academic_year_id', acYear?.id)
      .eq('status', 'approved')
      .order('recorded_at', { ascending: false });

    const scoreRows = (scores || []) as Array<{
      id: string;
      points: number;
      note: string | null;
      recorded_at: string;
      category_name_at_record: string | null;
      category_type_at_record: string | null;
      score_categories?: { name?: string; type?: string } | null;
      profiles?: { full_name?: string } | null;
    }>;
    const totalDeducted = scoreRows.filter((t) => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0);
    const totalAdded = scoreRows.filter((t) => t.points > 0).reduce((s, t) => s + t.points, 0);
    const teacherNames = await getClassroomTeacherNames(student.classroom_id || '');
    const studentDetail = await getStudentById(student.id);
    const studentProfile = student.profiles as unknown as Record<string, unknown> | null;
    const studentClassroom = student.classrooms as unknown as Record<string, unknown> | null;
    const profilePrefix = (studentProfile?.prefix as string) || '';
    const profileFullName = (studentProfile?.full_name as string) || '';

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          prefix: profilePrefix,
          full_name: profileFullName.replace(profilePrefix, '').trim(),
          student_id_number: student.student_id_number,
          classroom_name: (studentClassroom?.name as string) || '',
          grade_level: studentClassroom?.grade_level as number,
          education_stage_id: studentClassroom?.education_stage_id as string,
          homeroom_teacher_name: teacherNames.homeroom || '',
          advisor_teacher_name: teacherNames.advisor || teacherNames.homeroom || '',
          guardian_full_name: studentDetail?.guardian_full_name || '',
          guardian_relation: studentDetail?.guardian_relation || '',
          guardian_phone: studentDetail?.guardian_phone || '',
        },
        summary: {
          current_score: baseScore - totalDeducted + totalAdded,
          total_deducted: totalDeducted,
          total_added: totalAdded,
          base_score: baseScore,
        },
        transactions: scoreRows.map((t) => ({
          id: t.id,
          points: t.points,
          note: t.note,
          recorded_at: t.recorded_at,
          category_name: t.category_name_at_record || t.score_categories?.name || '',
          category_type: t.category_type_at_record || t.score_categories?.type || '',
          recorded_by_name: t.profiles?.full_name || '',
        })),
      },
    };
  });
}

/**
 * Archive (soft-delete) a student — sets status to 'inactive'
 * Requires admin or teacher role.
 */
export async function deleteStudent(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const before = await getStudentById(id);
    await archiveStudent(id);
    clearTtlCacheByPrefix('students-for-select:');
    await logAudit({
      actorId: profile.id,
      action: 'student_archive',
      targetType: 'student',
      targetId: id,
      beforeData: before,
      afterData: { current_status: 'inactive' },
    });
    return { success: true, data: { id } };
  });
}

export async function getStudentListForSelect(academicYearId?: string) {
  return withAuth(async (profile) => {
    if (!canRecordScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดูรายชื่อนักเรียนสำหรับบันทึกคะแนน' } };
    }

    const cacheKey = `students-for-select:${academicYearId || 'current'}`;
    const cached = getTtlCache<StudentForSelect[]>(cacheKey);
    if (cached) return { success: true, data: cached };

    const supabase = await createAdminClient();
    let data: Record<string, unknown>[] | null = null;

    if (academicYearId) {
      const enrollmentResult = await supabase
        .from('student_enrollments')
        .select(`
          students!inner(
            id,
            student_id_number,
            profiles!inner(full_name, prefix)
          ),
          classrooms!inner(name, grade_level_id, grade_level, education_stage_id, grade_levels(name, level_no))
        `)
        .eq('academic_year_id', academicYearId)
        .in('enrollment_status', ['active', 'promoted', 'repeated', 'transferred', 'graduated']);
      data = (enrollmentResult.data || null) as Record<string, unknown>[] | null;
    }

    if (!academicYearId) {
      const studentResult = await supabase
        .from('students')
        .select(`
          id,
          student_id_number,
          profiles!inner(full_name, prefix),
          classrooms!inner(name, grade_level_id, grade_level, education_stage_id, grade_levels(name, level_no))
        `)
        .eq('current_status', 'active')
        .order('profiles(full_name)');
      data = (studentResult.data || []) as Record<string, unknown>[];
    }

    const rows = (data || []).map((row: Record<string, unknown>) => {
      if ('students' in row) {
        const student = row.students as Record<string, unknown>;
        return {
          id: student?.id as string,
          student_id_number: student?.student_id_number as string,
          profiles: student?.profiles as Record<string, unknown>,
          classrooms: row.classrooms as Record<string, unknown>,
        };
      }
      return row;
    });

    const students: StudentForSelect[] = rows.map((s: Record<string, unknown>) => ({
      id: s.id as string,
      student_id_number: s.student_id_number as string,
      full_name: formatProfileFullName(s.profiles as Record<string, unknown>),
      classroom_name: (s.classrooms as Record<string, unknown>)?.name as string || '',
      grade_level_id: (s.classrooms as Record<string, unknown>)?.grade_level_id as string || '',
      grade_level_name: (((s.classrooms as Record<string, unknown>)?.grade_levels as Record<string, unknown>)?.name as string) || '',
      grade_level: (s.classrooms as Record<string, unknown>)?.grade_level as number || 0,
      education_stage_id: (s.classrooms as Record<string, unknown>)?.education_stage_id as string || '',
    }));
    setTtlCache(cacheKey, students, SHORT_LIST_TTL_MS);
    return { success: true, data: students };
  });
}

/**
 * Import students from CSV data (parsed server-side)
 * Uses admin client to bypass RLS and create auth users
 */
export async function importStudentsCsv(rows: Record<string, unknown>[]) {
  return withAuth(async (profile) => {
    if (!canImportData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์นำเข้าข้อมูล' } };
    }

    const adminClient = await createAdminClient();
    const errors: { row: number; message: string }[] = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const academicYearName = String(row['ปีการศึกษา'] || row['academic_year'] || '').trim();
        const studentId = String(row['รหัสนักเรียน'] || row['student_id'] || row['student_id_number'] || '');
        const prefix = String(row['คำนำหน้า'] || row['prefix'] || '');
        const firstName = String(row['ชื่อ'] || row['first_name'] || '');
        const lastName = String(row['นามสกุล'] || row['last_name'] || '');
        const gradeLevel = Number(row['ชั้นปี'] || row['grade_level'] || 1);
        const classroomName = String(row['ห้อง'] || row['classroom'] || '');
        const classNum = row['เลขที่ในห้อง'] || row['เลขที่'] || row['class_number'];
        const classNumber = classNum !== undefined && classNum !== '' ? Number(classNum) : undefined;
        const status = String(row['สถานะ'] || row['status'] || 'active');
        const guardianFullName = String(row['ชื่อผู้ปกครอง'] || row['guardian_full_name'] || row['guardian_name'] || '');
        const guardianRelation = String(row['ความสัมพันธ์'] || row['guardian_relation'] || 'guardian');
        const guardianPhone = String(row['เบอร์โทรผู้ปกครอง'] || row['guardian_phone'] || '');

        if (!studentId || !firstName || !lastName || !classroomName) {
          errors.push({ row: i + 1, message: 'ข้อมูลไม่ครบ (รหัส, ชื่อ, นามสกุล, ห้อง)' });
          continue;
        }

        const { data: acYear } = academicYearName
          ? await adminClient
            .from('academic_years')
            .select('id, name, start_date, end_date, is_current')
            .eq('name', academicYearName)
            .maybeSingle()
          : await adminClient
            .from('academic_years')
            .select('id, name, start_date, end_date, is_current')
            .eq('is_current', true)
            .maybeSingle();

        if (!acYear?.id) {
          errors.push({ row: i + 1, message: academicYearName ? `ไม่พบปีการศึกษา "${academicYearName}"` : 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' });
          continue;
        }

        if (!acYear.is_current) {
          errors.push({ row: i + 1, message: `นำเข้าได้เฉพาะปีการศึกษาปัจจุบัน (${acYear.name || academicYearName} ไม่ใช่ปีปัจจุบัน)` });
          continue;
        }

        const closedReason = getAcademicYearClosedReason(acYear);
        if (closedReason) {
          errors.push({ row: i + 1, message: `ไม่สามารถนำเข้านักเรียนของปี ${acYear.name || academicYearName} ได้ (${closedReason})` });
          continue;
        }

        // Find classroom
        const { data: classroom } = await adminClient
          .from('classrooms')
          .select('id')
          .eq('name', classroomName)
          .eq('grade_level', gradeLevel)
          .eq('academic_year_id', acYear.id)
          .maybeSingle();

        if (!classroom) {
          errors.push({ row: i + 1, message: `ไม่พบห้องเรียน "${classroomName}" ชั้นปี ${gradeLevel} ในปีการศึกษานี้` });
          continue;
        }

        const fullName = prefix ? `${prefix}${firstName} ${lastName}` : `${firstName} ${lastName}`;
        const normalizedStatus = status === 'active' ? 'active' : 'inactive';
        const normalizedGuardianRelation = normalizeGuardianRelation(guardianRelation);

        const { data: existingStudent } = await adminClient
          .from('students')
          .select('id, profile_id')
          .eq('student_id_number', studentId)
          .maybeSingle();

        if (existingStudent?.id) {
          await adminClient
            .from('profiles')
            .update({
              full_name: fullName,
              prefix: prefix || null,
              is_active: normalizedStatus === 'active',
            })
            .eq('id', existingStudent.profile_id);

          await adminClient
            .from('students')
            .update({
              classroom_id: classroom.id,
              current_status: normalizedStatus,
            })
            .eq('id', existingStudent.id);

          const enrollmentData: Record<string, unknown> = {
            student_id: existingStudent.id,
            classroom_id: classroom.id,
            academic_year_id: acYear.id,
            enrollment_status: normalizedStatus,
            source: 'annual_import',
          };
          if (classNumber !== undefined) {
            enrollmentData.class_number = classNumber;
          }

          const { data: existingEnrollment } = await adminClient
            .from('student_enrollments')
            .select('id')
            .eq('student_id', existingStudent.id)
            .eq('academic_year_id', acYear.id)
            .maybeSingle();

          if (existingEnrollment?.id) {
            await adminClient
              .from('student_enrollments')
              .update(enrollmentData)
              .eq('id', existingEnrollment.id);
          } else {
            await adminClient.from('student_enrollments').insert(enrollmentData);
          }

          await upsertPrimaryGuardian(adminClient, existingStudent.id, {
            full_name: guardianFullName,
            relation: normalizedGuardianRelation,
            phone: guardianPhone,
          });

          imported++;
          continue;
        }

        // Create auth user
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email: buildStudentLoginEmail(studentId, String(acYear.name || academicYearName)),
          password: 'Student@123',
          email_confirm: true,
          user_metadata: { full_name: `${firstName} ${lastName}`, role: 'student' },
        });

        if (authError || !authUser?.user) {
          errors.push({ row: i + 1, message: 'สร้างบัญชีผู้ใช้ไม่สำเร็จ' });
          continue;
        }

        // Create profile
        const { data: profile } = await adminClient
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            role: 'student',
            full_name: fullName,
            prefix: prefix || null,
            is_active: normalizedStatus === 'active',
          })
          .select('id')
          .single();

        if (!profile) {
          await adminClient.auth.admin.deleteUser(authUser.user.id);
          errors.push({ row: i + 1, message: 'สร้างโปรไฟล์ไม่สำเร็จ' });
          continue;
        }

        // Create student
        const { data: studentRecord } = await adminClient
          .from('students')
          .insert({
            profile_id: profile.id,
            student_id_number: studentId,
            classroom_id: classroom.id,
            current_status: normalizedStatus,
          })
          .select('id')
          .single();

        if (!studentRecord) {
          await adminClient.auth.admin.deleteUser(authUser.user.id);
          errors.push({ row: i + 1, message: 'สร้างข้อมูลนักเรียนไม่สำเร็จ' });
          continue;
        }

        // Create enrollment
        const enrollmentData: Record<string, unknown> = {
          student_id: studentRecord.id,
          classroom_id: classroom.id,
          academic_year_id: acYear.id,
          enrollment_status: normalizedStatus,
          source: 'annual_import',
        };
        if (classNumber !== undefined) {
          enrollmentData.class_number = classNumber;
        }
        await adminClient.from('student_enrollments').insert(enrollmentData);

        await upsertPrimaryGuardian(adminClient, studentRecord.id, {
          full_name: guardianFullName,
          relation: normalizedGuardianRelation,
          phone: guardianPhone,
        });

        imported++;
      } catch (err) {
        errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'ข้อผิดพลาดไม่ทราบสาเหตุ' });
      }
    }

    if (imported > 0) clearTtlCacheByPrefix('students-for-select:');
    await logAudit({
      actorId: profile.id,
      action: 'students_import_csv',
      targetType: 'student',
      afterData: { imported, error_count: errors.length },
      metadata: { row_count: rows.length, errors: errors.slice(0, 20) },
    });
    return { success: true, data: { imported, errors } };
  });
}

function normalizeGuardianRelation(value: string) {
  const normalized = value.trim().toLowerCase();
  const relationMap: Record<string, string> = {
    father: 'father',
    'บิดา': 'father',
    'พ่อ': 'father',
    mother: 'mother',
    'มารดา': 'mother',
    'แม่': 'mother',
    guardian: 'guardian',
    'ผู้ปกครอง': 'guardian',
    relative: 'relative',
    'ญาติ': 'relative',
    other: 'other',
    'อื่นๆ': 'other',
    'อื่น ๆ': 'other',
  };
  return relationMap[normalized] || 'guardian';
}

/**
 * Check if the current user can manage (edit/record score) for a given student.
 * Returns { isOwner: boolean, canManage: boolean }.
 * - isOwner: true if the viewer is the student themselves
 * - canManage: true if the viewer is admin or teacher
 */
export async function checkStudentViewerRole(studentId: string) {
  return withAuth(async (profile) => {
    const role = Array.isArray(profile.role) ? profile.role : [profile.role];
    const isAdmin = role.includes('admin') || role.includes('superadmin');
    const isTeacher = role.includes('teacher');

    if (isAdmin || isTeacher) {
      const canEditProfile = await canEditStudentProfile(profile, studentId);
      return {
        success: true,
        data: {
          isOwner: false,
          canManage: true,
          canEditProfile,
          canChangeStatus: isAdmin,
        },
      };
    }

    // Check if the viewer is the student themselves
    const adminClient = await createAdminClient();
    const { data: student } = await adminClient
      .from('student_enrollments')
      .select('id, students!inner(profile_id), academic_years!inner(is_current)')
      .eq('student_id', studentId)
      .eq('students.profile_id', profile.id)
      .eq('academic_years.is_current', true)
      .maybeSingle();

    return {
      success: true,
      data: { isOwner: !!student, canManage: false, canEditProfile: false, canChangeStatus: false },
    };
  });
}
