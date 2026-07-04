'use server';

import { revalidatePath } from 'next/cache';
import { withAuth } from '@/lib/server-action';
import { canManageSchoolData, canImportData } from '@/lib/security/roles';
import { createAdminClient } from '@/lib/supabase/server';
import {
  listTeachers,
  getTeacherById,
  getTeacherByProfileId,
  createTeacher,
  updateTeacher,
  assignTeacherToClassroom,
  removeTeacherFromClassroom,
} from '@/lib/db';
import { teacherSchema, teacherClassroomSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { logAudit } from '@/lib/audit/log';
import { normalizePhoneInput } from '@/lib/phone';
import { serverApiMessage } from '@/lib/i18n/server';
import { DEFAULT_TEACHER_POSITION, DEFAULT_TEACHER_SYSTEM_ROLE } from '@/lib/domain/person';
import { TEACHER_CSV_HEADERS, readCsvString } from '@/lib/domain/csv';

export async function getTeachers(params?: { search?: string; department?: string; include_inactive?: boolean }) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const result = await listTeachers(params);
    return { success: true, data: result };
  });
}

export async function getTeacher(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const teacher = await getTeacherById(id);
    if (!teacher) {
      return { success: false, error: { code: 'NOT_FOUND', message: await serverApiMessage('teacherNotFound') } };
    }
    return { success: true, data: teacher };
  });
}

export async function getMyTeacherProfile() {
  return withAuth(async (profile) => {
    const adminClient = await createAdminClient();
    const teacher = await getTeacherByProfileId(profile.id, adminClient);
    return { success: true, data: teacher };
  });
}

export async function updateMyTeacherProfile(data: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  position?: string;
  avatar_url?: string;
}) {
  return withAuth(async (profile) => {
    const adminClient = await createAdminClient();
    const teacher = await getTeacherByProfileId(profile.id, adminClient);
    if (!teacher) {
      return { success: false, error: { code: 'NOT_FOUND', message: await serverApiMessage('teacherProfileNotFound') } };
    }

    const validated = teacherSchema.partial().parse({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone !== undefined ? normalizePhoneInput(data.phone) : undefined,
      department: data.department,
      position: data.position,
      avatar_url: data.avatar_url,
    });

    const xssCheck = validateXSS({
      first_name: validated.first_name || '',
      last_name: validated.last_name || '',
      phone: validated.phone || '',
      department: validated.department || '',
      position: validated.position || '',
      avatar_url: validated.avatar_url || '',
    });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: await serverApiMessage('xssDetected') } };
    }

    const updateData = {
      first_name: validated.first_name,
      last_name: validated.last_name,
      phone: validated.phone,
      department: validated.department,
      position: validated.position,
      avatar_url: validated.avatar_url,
    };
    const before = await getTeacherById(teacher.id, adminClient);
    await updateTeacher(teacher.id, updateData, adminClient);
    const after = await getTeacherById(teacher.id, adminClient);
    await logAudit({
      actorId: profile.id,
      action: 'teacher_self_profile_update',
      targetType: 'teacher',
      targetId: teacher.id,
      beforeData: before,
      afterData: after,
      metadata: { changed_fields: Object.keys(updateData).filter((key) => updateData[key as keyof typeof updateData] !== undefined) },
    });

    revalidatePath("/teachers");
    return { success: true, data: after };
  });
}

export async function addTeacher(data: {
  prefix?: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id?: string;
  phone?: string;
  department?: string;
  position?: string;
  is_admin?: boolean;
  system_role?: 'teacher' | 'admin' | 'superadmin';
  avatar_url?: string;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const validated = teacherSchema.parse({
      ...data,
      phone: data.phone !== undefined ? normalizePhoneInput(data.phone) : undefined,
    });

    const xssCheck = validateXSS({
      first_name: validated.first_name,
      last_name: validated.last_name,
      email: validated.email,
      phone: validated.phone || '',
      department: validated.department || '',
      position: validated.position || '',
      avatar_url: validated.avatar_url || '',
    });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: await serverApiMessage('xssDetected') } };
    }

    const result = await createTeacher(validated);
    const createdTeacher = await getTeacherById(result.id);
    await logAudit({
      actorId: profile.id,
      action: 'teacher_create',
      targetType: 'teacher',
      targetId: result.id,
      afterData: validated,
    });
    return { success: true, data: createdTeacher };
  });
}

export async function editTeacher(id: string, data: {
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
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const adminClient = await createAdminClient();
    const validated = teacherSchema.partial().parse({
      ...data,
      phone: data.phone !== undefined ? normalizePhoneInput(data.phone) : undefined,
    });
    const before = await getTeacherById(id, adminClient);
    await updateTeacher(id, validated, adminClient);
    const after = await getTeacherById(id, adminClient);
    await logAudit({
      actorId: profile.id,
      action: 'teacher_update',
      targetType: 'teacher',
      targetId: id,
      beforeData: before,
      afterData: after,
      metadata: { changed_fields: Object.keys(validated) },
    });
    revalidatePath("/teachers");
    return { success: true, data: after };
  });
}

export async function setTeacherActive(id: string, isActive: boolean) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const before = await getTeacherById(id);
    await updateTeacher(id, { is_active: isActive });
    await logAudit({
      actorId: profile.id,
      action: isActive ? 'teacher_activate' : 'teacher_deactivate',
      targetType: 'teacher',
      targetId: id,
      beforeData: before ? { is_active: before.is_active } : null,
      afterData: { is_active: isActive },
    });
    revalidatePath("/teachers");
    return { success: true, data: { id, is_active: isActive } };
  });
}

export async function assignClassroom(data: {
  teacher_id: string;
  classroom_id: string;
  assignment_role?: string;
}) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const validated = teacherClassroomSchema.parse(data);
    await assignTeacherToClassroom({
      ...validated,
      assigned_by: profile.id,
    });
    await logAudit({
      actorId: profile.id,
      action: 'teacher_classroom_assign',
      targetType: 'teacher_classroom',
      targetId: validated.classroom_id,
      afterData: validated,
    });

    revalidatePath("/teachers");
    return { success: true, data: null };
  });
}

export async function unassignClassroom(teacherId: string, classroomId: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    await removeTeacherFromClassroom(teacherId, classroomId);
    await logAudit({
      actorId: profile.id,
      action: 'teacher_classroom_unassign',
      targetType: 'teacher_classroom',
      targetId: classroomId,
      metadata: { teacher_id: teacherId },
    });
    revalidatePath("/teachers");
    return { success: true, data: null };
  });
}

/**
 * Import teachers from CSV data
 */
export async function importTeachersCsv(rows: Record<string, unknown>[]) {
  return withAuth(async (profile) => {
    if (!canImportData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('importDataForbidden') } };
    }

    const errors: { row: number; message: string }[] = [];
    let imported = 0;

    // Get current academic year once for classroom assignment
    const supabase = await createAdminClient();
    const { data: currentYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();
    const currentAcademicYearId = currentYear?.id as string | undefined;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const prefix = readCsvString(row, TEACHER_CSV_HEADERS.prefix).trim();
        const firstName = readCsvString(row, TEACHER_CSV_HEADERS.firstName).trim();
        const lastName = readCsvString(row, TEACHER_CSV_HEADERS.lastName).trim();
        const email = readCsvString(row, TEACHER_CSV_HEADERS.email).trim();
        const employeeId = readCsvString(row, TEACHER_CSV_HEADERS.employeeId).trim();
        const phone = readCsvString(row, TEACHER_CSV_HEADERS.phone).trim();
        const department = readCsvString(row, TEACHER_CSV_HEADERS.department).trim();
        const position = readCsvString(row, TEACHER_CSV_HEADERS.position, DEFAULT_TEACHER_POSITION).trim();
        const systemRole = readCsvString(row, TEACHER_CSV_HEADERS.systemRole, DEFAULT_TEACHER_SYSTEM_ROLE).trim();
        const classroomName = readCsvString(row, TEACHER_CSV_HEADERS.homeroom).trim();

        if (!prefix || !firstName || !lastName || !email) {
          errors.push({ row: i + 1, message: await serverApiMessage('teacherImportMissingRequiredFields') });
          continue;
        }

        const validRoles = ['teacher', 'admin', 'superadmin'];
        const normalizedRole = validRoles.includes(systemRole) ? systemRole : 'teacher';

        const result = await addTeacher({
          prefix,
          first_name: firstName,
          last_name: lastName,
          email,
          employee_id: employeeId,
          phone: phone || undefined,
          department: department || undefined,
          position: position || DEFAULT_TEACHER_POSITION,
          system_role: normalizedRole as 'teacher' | 'admin' | 'superadmin',
        });

        if (result.success) {
          imported++;

          // Assign homeroom classroom if specified
          if (classroomName && result.data && currentAcademicYearId) {
            try {
              const { data: classroom } = await supabase
                .from('classrooms')
                .select('id')
                .eq('name', classroomName)
                .eq('academic_year_id', currentAcademicYearId)
                .maybeSingle();

              if (classroom?.id) {
                await assignTeacherToClassroom({
                  teacher_id: (result.data as { id: string }).id,
                  classroom_id: classroom.id,
                  assignment_role: 'homeroom',
                  assigned_by: profile.id,
                });
              }
            } catch {
              // Classroom assignment failure shouldn't fail the whole import
            }
          }
        } else {
          errors.push({ row: i + 1, message: await serverApiMessage('teacherImportSaveFailed') });
        }
      } catch (err) {
        console.error('[importTeachersCsv] Row import failed:', err);
        errors.push({ row: i + 1, message: await serverApiMessage('teacherImportSaveFailed') });
      }
    }

    revalidatePath("/teachers");
    return { success: true, data: { imported, errors } };
  });
}

export async function resetTeacherPassword(teacherId: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverApiMessage('superadminOnly') } };
    }

    const supabase = await createAdminClient();

    // Get teacher with profile
    const teacher = await getTeacherById(teacherId, supabase);
    if (!teacher) {
      return { success: false, error: { code: 'NOT_FOUND', message: await serverApiMessage('teacherNotFound') } };
    }

    // Get profile to find user_id
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', teacher.profile_id)
      .single();

    if (profileError || !profileData?.user_id) {
      return { success: false, error: { code: 'NOT_FOUND', message: await serverApiMessage('teacherAuthUserNotFound') } };
    }

    // Send password reset email via Supabase Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      teacher.email || '',
      { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/reset-password` }
    );

    if (resetError) {
      const msg = resetError.status === 429
        ? await serverApiMessage('rateLimited')
        : await serverApiMessage('teacherPasswordResetFailed');
      return { success: false, error: { code: 'RESET_FAILED', message: msg } };
    }

    await logAudit({
      actorId: profile.id,
      action: 'teacher_password_reset',
      targetType: 'teacher',
      targetId: teacherId,
      metadata: { teacher_name: teacher.full_name },
    });

    revalidatePath("/teachers");
    return { success: true, data: { message: await serverApiMessage('teacherPasswordResetSent', { email: teacher.email || '' }) } };
  });
}
