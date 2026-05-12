import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Teacher } from '@/types';

export interface TeacherWithProfile extends Teacher {
  full_name?: string;
  email?: string;
  avatar_url?: string;
  is_active?: boolean;
  roles?: string[];
  assigned_classrooms?: {
    classroom_id: string;
    classroom_name: string;
    education_stage_name: string;
    grade_level: number;
    assignment_role: string;
  }[];
}

const teacherPrefixes = ['นาย', 'นางสาว', 'นาง'] as const;

function parseTeacherProfile(profile?: Record<string, unknown>) {
  let fullName = String(profile?.full_name || '').trim();
  let prefix = String(profile?.prefix || '').trim();

  if (!prefix || prefix === 'ครู') {
    prefix = teacherPrefixes.find((item) => fullName.startsWith(item)) || 'นาย';
  }

  if (fullName.startsWith(prefix)) {
    fullName = fullName.slice(prefix.length).trim();
  }
  if (fullName.startsWith('ครู')) {
    fullName = fullName.slice('ครู'.length).trim();
  }

  const spaceIdx = fullName.indexOf(' ');
  const firstName = spaceIdx >= 0 ? fullName.slice(0, spaceIdx).trim() : fullName;
  const lastName = spaceIdx >= 0 ? fullName.slice(spaceIdx + 1).trim() : '';
  const displayName = fullName ? `${prefix}${fullName}` : '';

  return { prefix, first_name: firstName, last_name: lastName, full_name: displayName };
}

function normalizeRoles(role: unknown): string[] {
  if (Array.isArray(role)) return role.map(String);
  if (typeof role === 'string') return [role];
  return [];
}

function rolesForTeacher(systemRole?: string, isAdmin?: boolean): string[] {
  if (systemRole === 'superadmin') return ['superadmin', 'teacher'];
  if (systemRole === 'admin' || isAdmin) return ['admin', 'teacher'];
  return ['teacher'];
}

/**
 * List teachers
 */
export async function listTeachers(params: { search?: string; department?: string; include_inactive?: boolean } = {}) {
  const supabase = await createClient();

  let query = supabase
    .from('teachers')
    .select(`
      *,
      profiles!inner(full_name, user_id, prefix, role, avatar_url, is_active),
      teacher_classrooms(
        classroom_id,
        assignment_role,
        classrooms!inner(name, education_stage_id, grade_level)
      )
    `);

  if (params.department) {
    query = query.eq('department', params.department);
  }
  if (!params.include_inactive) {
    query = query.eq('profiles.is_active', true);
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
    ...parseTeacherProfile(t.profiles as Record<string, unknown>),
    id: t.id as string,
    profile_id: t.profile_id as string,
    employee_id: t.employee_id as string,
    phone: t.phone as string | undefined,
    department: t.department as string | undefined,
    position: t.position as string | undefined || 'ครู',
    roles: normalizeRoles((t.profiles as Record<string, unknown>)?.role),
    avatar_url: (t.profiles as Record<string, unknown>)?.avatar_url as string | undefined,
    is_active: (t.profiles as Record<string, unknown>)?.is_active as boolean | undefined,
    email: t.email as string | undefined || '',
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
export async function getTeacherById(id: string, client?: SupabaseClient): Promise<TeacherWithProfile | null> {
  const supabase = client || await createClient();

  const { data, error } = await supabase
    .from('teachers')
    .select(`
      *,
      profiles!inner(full_name, user_id, prefix, role, avatar_url, is_active),
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
    ...parseTeacherProfile(data.profiles as Record<string, unknown>),
    id: data.id,
    profile_id: data.profile_id,
    employee_id: data.employee_id,
    phone: data.phone,
    department: data.department,
    position: data.position || 'ครู',
    roles: normalizeRoles(data.profiles?.role),
    avatar_url: data.profiles?.avatar_url || undefined,
    is_active: data.profiles?.is_active ?? true,
    email: data.email || '',
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
 * Get teacher by profile ID.
 */
export async function getTeacherByProfileId(profileId: string, client?: SupabaseClient): Promise<TeacherWithProfile | null> {
  const supabase = client || await createClient();

  const { data, error } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error || !data?.id) return null;

  return getTeacherById(data.id, supabase);
}

/**
 * Create teacher with auth user and profile
 */
export async function createTeacher(data: {
  prefix?: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  phone?: string;
  department?: string;
  position?: string;
  is_admin?: boolean;
  system_role?: 'teacher' | 'admin' | 'superadmin';
  avatar_url?: string;
}) {
  const supabase = await createClient();
  const roles = rolesForTeacher(data.system_role, data.is_admin);
  const prefix = data.prefix || 'นาย';
  const fullName = `${data.first_name} ${data.last_name}`;

  // 1. Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: 'Teacher@123',
    email_confirm: true,
    user_metadata: { full_name: fullName, prefix, role: roles },
  });

  if (authError) throw authError;
  if (!authUser.user) throw new Error('Failed to create auth user');

  // 2. Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: authUser.user.id,
      role: roles,
      prefix,
      full_name: fullName,
      phone: data.phone || null,
      avatar_url: data.avatar_url || null,
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
      phone: data.phone || null,
      email: data.email,
      department: data.department || null,
      position: data.position || 'ครู',
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
  prefix?: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  is_admin?: boolean;
  system_role?: 'teacher' | 'admin' | 'superadmin';
  is_active?: boolean;
  avatar_url?: string;
}, client?: SupabaseClient) {
  const supabase = client || await createClient();

  const teacher = await supabase
    .from('teachers')
    .select('profile_id')
    .eq('id', id)
    .single();

  if (data.first_name || data.last_name || data.prefix !== undefined || data.phone !== undefined || data.is_admin !== undefined || data.system_role !== undefined || data.avatar_url !== undefined) {
    if (teacher.data?.profile_id) {
      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
      const profileUpdate: Record<string, unknown> = {};
      if (fullName) {
        profileUpdate.full_name = fullName;
      }
      if (data.prefix !== undefined) {
        profileUpdate.prefix = data.prefix || null;
      }
      if (data.phone !== undefined) {
        profileUpdate.phone = data.phone || null;
      }
      if (data.system_role !== undefined || data.is_admin !== undefined) {
        profileUpdate.role = rolesForTeacher(data.system_role, data.is_admin);
      }
      if (data.avatar_url !== undefined) {
        profileUpdate.avatar_url = data.avatar_url || null;
      }
      if (Object.keys(profileUpdate).length > 0) {
        await supabase
          .from('profiles')
          .update(profileUpdate)
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
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.position !== undefined) updateData.position = data.position || 'ครู';

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
    .upsert({
      teacher_id: data.teacher_id,
      classroom_id: data.classroom_id,
      assignment_role: data.assignment_role || 'homeroom',
      assigned_by: data.assigned_by,
    }, {
      onConflict: 'teacher_id,classroom_id,assignment_role',
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
