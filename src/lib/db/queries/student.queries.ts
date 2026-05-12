import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Student } from '@/types';

export type StudentWithProfile = Student & {
  prefix: string;
  first_name: string;
  last_name: string;
  classroom_name: string;
  grade_level_id?: string;
  grade_level_name?: string;
  grade_level: number;
  education_stage_name: string;
  homeroom_teacher_name?: string;
  advisor_teacher_name?: string;
  guardian_full_name?: string;
  guardian_relation?: string;
  guardian_phone?: string;
  avatar_url?: string;
  current_score?: number;
};

export interface StudentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  classroom_id?: string;
  grade_level_id?: string;
  grade_level?: number;
  education_stage_id?: string;
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

function formatTeacherName(profile?: Record<string, unknown>) {
  const prefix = String(profile?.prefix || '').trim();
  let fullName = String(profile?.full_name || '').trim();
  if (fullName.startsWith('ครู')) {
    fullName = fullName.slice('ครู'.length).trim();
  }
  return prefix && fullName && !fullName.startsWith(prefix) ? `${prefix}${fullName}` : fullName;
}

// Parse profile full_name into prefix, first_name, last_name
function parseProfile(profile: Record<string, unknown>): { prefix: string; first_name: string; last_name: string } {
  let fullName = ((profile.full_name as string) || '').trim();
  let prefix = ((profile.prefix as string) || '').trim();
  const knownPrefixes = ['เด็กชาย', 'เด็กหญิง', 'นาย', 'นางสาว', 'นาง'];
  if (!prefix) {
    prefix = knownPrefixes.find((p) => fullName.startsWith(p)) || '';
  }
  if (prefix && fullName.startsWith(prefix)) {
    fullName = fullName.slice(prefix.length).trim();
  }
  if (!fullName) return { prefix, first_name: '', last_name: '' };
  const spaceIdx = fullName.indexOf(' ');
  if (spaceIdx > 0) {
    return { prefix, first_name: fullName.slice(0, spaceIdx).trim(), last_name: fullName.slice(spaceIdx + 1).trim() };
  }
  return { prefix, first_name: fullName, last_name: '' };
}

// Cache for education stages lookup
let stagesCache: Map<string, string> | null = null;
async function getStageName(stageId: string): Promise<string> {
  if (!stagesCache) {
    const supabase = await createClient();
    const { data } = await supabase.from('education_stages').select('id, name_th');
    stagesCache = new Map();
    if (data) {
      for (const s of data) {
        stagesCache.set(s.id, s.name_th);
      }
    }
  }
  return stagesCache.get(stageId) || '';
}
// Reset cache (for testing)
export function resetStagesCache() { stagesCache = null; }

function buildStudentLoginEmail(studentIdNumber: string, academicYearId?: string) {
  const yearSegment = academicYearId ? academicYearId.replace(/[^0-9A-Za-z-]/g, '') : 'manual';
  return `${studentIdNumber}.${yearSegment}@student.school.com`;
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
    education_stage_id,
    status,
    academic_year,
  } = params;

  let query = supabase
    .from('students')
    .select(`
      *,
      profiles!inner(full_name, prefix, avatar_url),
      classrooms!inner(name, grade_level_id, grade_level, education_stage_id, academic_year_id, grade_levels(name, level_no))
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
  if (params.grade_level_id) {
    query = query.eq('classrooms.grade_level_id', params.grade_level_id);
  }
  if (education_stage_id) {
    query = query.eq('classrooms.education_stage_id', education_stage_id);
  }
  if (status) {
    query = query.eq('current_status', status);
  }
  if (academic_year) {
    query = query.eq('classrooms.academic_year_id', academic_year);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  const { data, error, count } = await query
    .order('profiles(full_name)', { ascending: true })
    .range(from, to);

  if (error) throw error;

  const studentIds = (data || []).map((s: Record<string, unknown>) => s.id as string);
  const [guardianByStudentId, scoreByStudentId] = await Promise.all([
    getPrimaryGuardians(studentIds),
    getScoreByStudentId(studentIds, academic_year),
  ]);

  const mapped: StudentWithProfile[] = await Promise.all((data || []).map(async (s: Record<string, unknown>) => {
    const profile = s.profiles as Record<string, unknown> || {};
    const { prefix, first_name, last_name } = parseProfile(profile);
    const classroom = s.classrooms as Record<string, unknown> || {};
    const stageId = classroom.education_stage_id as string || '';
    const guardian = guardianByStudentId.get(s.id as string);
    return {
      id: s.id as string,
      profile_id: s.profile_id as string,
      student_id_number: s.student_id_number as string,
      classroom_id: s.classroom_id as string,
      current_status: s.current_status as Student['current_status'],
      prefix,
      first_name,
      last_name,
      classroom_name: classroom.name as string || '',
      grade_level_id: classroom.grade_level_id as string || '',
      grade_level_name: ((classroom.grade_levels as Record<string, unknown>)?.name as string) || '',
      grade_level: classroom.grade_level as number || 0,
      education_stage_name: stageId ? await getStageName(stageId) : '',
      guardian_full_name: guardian?.full_name || '',
      guardian_relation: guardian?.relation || '',
      guardian_phone: guardian?.phone || '',
      avatar_url: profile.avatar_url as string | undefined,
      current_score: scoreByStudentId.get(s.id as string) ?? 100,
    };
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
      profiles!inner(full_name, prefix, avatar_url),
      classrooms!inner(name, grade_level_id, grade_level, education_stage_id, grade_levels(name, level_no))
    `)
    .eq('id', id)
    .single();

  if (error) return null;
  if (!data) return null;

  const profiles = data.profiles as Record<string, unknown> || {};
  const { prefix, first_name, last_name } = parseProfile(profiles);
  const classroom = data.classrooms as Record<string, unknown> || {};
  const stageId = classroom.education_stage_id as string || '';
  const teacherNames = await getClassroomTeacherNames(data.classroom_id);
  const guardian = (await getPrimaryGuardians([data.id])).get(data.id);

  return {
    id: data.id,
    profile_id: data.profile_id,
    student_id_number: data.student_id_number,
    classroom_id: data.classroom_id,
    current_status: data.current_status,
    prefix,
    first_name,
    last_name,
    classroom_name: classroom.name as string || '',
    grade_level_id: classroom.grade_level_id as string || '',
    grade_level_name: ((classroom.grade_levels as Record<string, unknown>)?.name as string) || '',
    grade_level: classroom.grade_level as number || 0,
    education_stage_name: stageId ? await getStageName(stageId) : '',
    homeroom_teacher_name: teacherNames.homeroom || '',
    advisor_teacher_name: teacherNames.advisor || teacherNames.homeroom || '',
    guardian_full_name: guardian?.full_name || '',
    guardian_relation: guardian?.relation || '',
    guardian_phone: guardian?.phone || '',
    avatar_url: profiles.avatar_url as string | undefined,
  };
}

async function getPrimaryGuardians(studentIds: string[]) {
  const supabase = await createAdminClient();
  const guardianByStudentId = new Map<string, { full_name: string; relation: string; phone: string }>();
  if (studentIds.length === 0) return guardianByStudentId;

  const { data } = await supabase
    .from('student_guardians')
    .select('student_id, relation, is_primary, guardians(full_name, phone)')
    .in('student_id', studentIds)
    .order('is_primary', { ascending: false });

  for (const row of data || []) {
    const studentId = row.student_id as string;
    if (guardianByStudentId.has(studentId)) continue;
    const guardian = row.guardians as unknown as Record<string, unknown>;
    guardianByStudentId.set(studentId, {
      full_name: (guardian?.full_name as string) || '',
      relation: (row.relation as string) || '',
      phone: (guardian?.phone as string) || '',
    });
  }

  return guardianByStudentId;
}

async function getScoreByStudentId(studentIds: string[], academicYearId?: string) {
  const supabase = await createAdminClient();
  const scoreByStudentId = new Map<string, number>();
  if (studentIds.length === 0) return scoreByStudentId;

  let baseScore = 100;
  if (academicYearId) {
    const { data: academicYear } = await supabase
      .from('academic_years')
      .select('base_score')
      .eq('id', academicYearId)
      .maybeSingle();
    baseScore = (academicYear?.base_score as number | undefined) || 100;
  }

  let query = supabase
    .from('score_transactions')
    .select('student_id, points')
    .in('student_id', studentIds)
    .eq('status', 'approved');

  if (academicYearId) {
    query = query.eq('academic_year_id', academicYearId);
  }

  const { data } = await query;

  for (const studentId of studentIds) scoreByStudentId.set(studentId, baseScore);
  for (const row of data || []) {
    const studentId = row.student_id as string;
    scoreByStudentId.set(studentId, (scoreByStudentId.get(studentId) ?? baseScore) + ((row.points as number) || 0));
  }

  return scoreByStudentId;
}

export async function getClassroomTeacherNames(classroomId: string) {
  const supabase = await createAdminClient();
  const { data: assignments } = await supabase
    .from('teacher_classrooms')
    .select('teacher_id, assignment_role')
    .eq('classroom_id', classroomId)
    .in('assignment_role', ['homeroom', 'assistant']);

  const teacherIds = Array.from(new Set((assignments || []).map((a) => a.teacher_id as string).filter(Boolean)));
  if (teacherIds.length === 0) return { homeroom: '', advisor: '' };

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, profiles!inner(full_name, prefix)')
    .in('id', teacherIds);

  const teacherNameById = new Map<string, string>();
  for (const teacher of teachers || []) {
    teacherNameById.set(
      teacher.id as string,
      formatTeacherName(teacher.profiles as unknown as Record<string, unknown>),
    );
  }

  let homeroom = '';
  let advisor = '';
  for (const assignment of assignments || []) {
    const teacherName = teacherNameById.get(assignment.teacher_id as string) || '';
    if (assignment.assignment_role === 'homeroom') homeroom = teacherName;
    if (assignment.assignment_role === 'assistant') advisor = teacherName;
  }

  return { homeroom, advisor: advisor || homeroom };
}

/**
 * Get student score summary (total deducted, total added, current score)
 */
export async function getStudentScoreSummary(studentId: string, academicYearId?: string) {
  const supabase = await createClient();

  let baseScore = 100;
  if (academicYearId) {
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('base_score')
      .eq('id', academicYearId)
      .single();
    if (acYear?.base_score) {
      baseScore = acYear.base_score;
    }
  }

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
    current_score: baseScore - totalDeducted + totalAdded,
    base_score: baseScore,
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
      classrooms(name, grade_level),
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
      profiles!inner(full_name, prefix),
      classrooms!inner(name, grade_level_id, grade_level, education_stage_id, grade_levels(name, level_no))
    `)
    .eq('classroom_id', classroomId)
    .eq('current_status', 'active')
    .order('profiles(full_name)', { ascending: true });

  if (error) throw error;

  return Promise.all((data || []).map(async (s: Record<string, unknown>) => {
    const profile = s.profiles as Record<string, unknown> || {};
    const { prefix, first_name, last_name } = parseProfile(profile);
    const classroom = s.classrooms as Record<string, unknown> || {};
    const stageId = classroom.education_stage_id as string || '';
    return {
      id: s.id as string,
      profile_id: s.profile_id as string,
      student_id_number: s.student_id_number as string,
      classroom_id: s.classroom_id as string,
      current_status: s.current_status as Student['current_status'],
      prefix,
      first_name,
      last_name,
      classroom_name: classroom.name as string || '',
      grade_level_id: classroom.grade_level_id as string || '',
      grade_level_name: ((classroom.grade_levels as Record<string, unknown>)?.name as string) || '',
      grade_level: classroom.grade_level as number || 0,
      education_stage_name: stageId ? await getStageName(stageId) : '',
    };
  }));
}
export async function createStudent(data: {
  prefix?: string;
  first_name: string;
  last_name: string;
  student_id_number: string;
  classroom_id: string;
  class_number?: number;
  academic_year_id?: string;
  avatar_url?: string;
  guardian_full_name?: string;
  guardian_relation?: string;
  guardian_phone?: string;
}) {
  const supabase = await createAdminClient();

  const prefix = data.prefix || '';
  const fullName = prefix ? `${prefix}${data.first_name} ${data.last_name}` : `${data.first_name} ${data.last_name}`;

  // 1. Create auth user for student
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: buildStudentLoginEmail(data.student_id_number, data.academic_year_id),
    password: 'Student@123',
    email_confirm: true,
    user_metadata: { full_name: fullName, prefix, first_name: data.first_name, last_name: data.last_name, role: 'student' },
  });

  if (authError) throw authError;
  if (!authUser.user) throw new Error('Failed to create auth user');

  // 2. Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: authUser.user.id,
      role: 'student',
      full_name: fullName,
      prefix: prefix || null,
      avatar_url: data.avatar_url || null,
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

  // 4. Create enrollment (class_number is optional)
  const enrollmentData: Record<string, unknown> = {
    student_id: student.id,
    classroom_id: data.classroom_id,
    enrollment_status: 'active',
    source: 'manual',
  };
  if (data.academic_year_id) {
    enrollmentData.academic_year_id = data.academic_year_id;
  }
  if (data.class_number !== undefined) {
    enrollmentData.class_number = data.class_number;
  }
  const { error: enrollmentError } = await supabase
    .from('student_enrollments')
    .insert(enrollmentData);

  if (enrollmentError) throw enrollmentError;

  await upsertPrimaryGuardian(supabase, student.id, {
    full_name: data.guardian_full_name,
    relation: data.guardian_relation,
    phone: data.guardian_phone,
  });

  return student;
}

/**
 * Update student
 */
export async function updateStudent(id: string, data: {
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
  const supabase = await createClient();

  // Get current student and profile
  const { data: student } = await supabase
    .from('students')
    .select('profile_id')
    .eq('id', id)
    .single();

  // Update profile name/avatar if changed
  if (data.first_name || data.last_name || data.prefix !== undefined || data.avatar_url !== undefined) {
    if (student?.profile_id) {
      // Get current profile to merge with existing values
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('full_name, prefix')
        .eq('id', student.profile_id)
        .single();

      const prefix = data.prefix ?? currentProfile?.prefix ?? '';
      const firstName = data.first_name || '';
      const lastName = data.last_name || '';

      // If we have both prefix and names, construct full_name
      let newFullName: string;
      if (prefix && firstName && lastName) {
        newFullName = `${prefix}${firstName} ${lastName}`;
      } else if (firstName && lastName) {
        newFullName = `${firstName} ${lastName}`;
      } else if (data.first_name || data.last_name) {
        // Partial update — only provided fields changed
        const existing = currentProfile?.full_name || '';
        if (prefix && !existing.startsWith(prefix)) {
          newFullName = `${prefix}${existing}`;
        } else {
          newFullName = existing;
        }
      } else {
        newFullName = currentProfile?.full_name || '';
      }

      const profileUpdate: Record<string, unknown> = { full_name: newFullName };
      if (data.prefix !== undefined) profileUpdate.prefix = data.prefix || null;
      if (data.first_name || data.last_name) profileUpdate.full_name = newFullName;

      // Update avatar if provided
      if (data.avatar_url !== undefined) {
        profileUpdate.avatar_url = data.avatar_url || null;
      }

      await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', student.profile_id);
    }
  }

  // Update students table
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

  // Update enrollment class_number if provided
  if (data.class_number) {
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('student_id', id)
      .eq('enrollment_status', 'active')
      .maybeSingle();

    if (enrollment) {
      await supabase
        .from('student_enrollments')
        .update({ class_number: data.class_number })
        .eq('id', enrollment.id);
    }
  }

  await upsertPrimaryGuardian(supabase, id, {
    full_name: data.guardian_full_name,
    relation: data.guardian_relation,
    phone: data.guardian_phone,
  });

  return { success: true };
}

export async function upsertPrimaryGuardian(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  guardianData: {
    full_name?: string;
    relation?: string;
    phone?: string;
  },
) {
  const fullName = guardianData.full_name?.trim();
  const phone = guardianData.phone?.trim();
  const relation = guardianData.relation || 'guardian';

  if (!fullName && !phone) return;
  if (!fullName || !phone) {
    throw new Error('กรุณากรอกชื่อผู้ปกครองและเบอร์โทรให้ครบ');
  }

  const { data: existingLink } = await supabase
    .from('student_guardians')
    .select('guardian_id')
    .eq('student_id', studentId)
    .eq('is_primary', true)
    .maybeSingle();

  if (existingLink?.guardian_id) {
    const { error: guardianError } = await supabase
      .from('guardians')
      .update({ full_name: fullName, phone })
      .eq('id', existingLink.guardian_id);
    if (guardianError) throw guardianError;

    const { error: relationError } = await supabase
      .from('student_guardians')
      .update({ relation, is_primary: true })
      .eq('student_id', studentId)
      .eq('guardian_id', existingLink.guardian_id);
    if (relationError) throw relationError;
    return;
  }

  const { data: guardian, error: guardianError } = await supabase
    .from('guardians')
    .insert({ full_name: fullName, phone })
    .select('id')
    .single();
  if (guardianError) throw guardianError;

  const { error: linkError } = await supabase
    .from('student_guardians')
    .insert({
      student_id: studentId,
      guardian_id: guardian.id,
      relation,
      is_primary: true,
      can_receive_notifications: true,
    });
  if (linkError) throw linkError;
}

/**
 * Soft-delete (archive) a student — sets status to 'inactive'
 */
export async function archiveStudent(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('students')
    .update({ current_status: 'inactive' })
    .eq('id', id);

  if (error) throw error;
}
