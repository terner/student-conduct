'use server';

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

export async function getTeachers(params?: { search?: string; department?: string; include_inactive?: boolean }) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const result = await listTeachers(params);
    return { success: true, data: result };
  });
}

export async function getTeacher(id: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const teacher = await getTeacherById(id);
    if (!teacher) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลครู' } };
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
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลครูของผู้ใช้นี้' } };
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
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
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
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    const result = await createTeacher(validated);
    await logAudit({
      actorId: profile.id,
      action: 'teacher_create',
      targetType: 'teacher',
      targetId: result.id,
      afterData: validated,
    });
    return { success: true, data: result };
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
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
    return { success: true, data: { id } };
  });
}

export async function setTeacherActive(id: string, isActive: boolean) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
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

    return { success: true, data: null };
  });
}

export async function unassignClassroom(teacherId: string, classroomId: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    await removeTeacherFromClassroom(teacherId, classroomId);
    await logAudit({
      actorId: profile.id,
      action: 'teacher_classroom_unassign',
      targetType: 'teacher_classroom',
      targetId: classroomId,
      metadata: { teacher_id: teacherId },
    });
    return { success: true, data: null };
  });
}

/**
 * Import teachers from CSV data
 */
export async function importTeachersCsv(rows: Record<string, unknown>[]) {
  return withAuth(async (profile) => {
    if (!canImportData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์นำเข้าข้อมูล' } };
    }

    const errors: { row: number; message: string }[] = [];
    let imported = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const prefix = String(row['คำนำหน้า'] || row['prefix'] || '').trim();
        const firstName = String(row['ชื่อ'] || row['first_name'] || '').trim();
        const lastName = String(row['นามสกุล'] || row['last_name'] || '').trim();
        const email = String(row['อีเมล'] || row['email'] || '').trim();
        const employeeId = String(row['รหัสเจ้าหน้าที่'] || row['employee_id'] || row['employeeId'] || '').trim();
        const phone = String(row['เบอร์โทร'] || row['phone'] || '').trim();
        const department = String(row['แผนก'] || row['department'] || '').trim();
        const position = String(row['ตำแหน่ง'] || row['position'] || 'ครู').trim();
        const systemRole = String(row['สิทธิ์ในระบบ'] || row['system_role'] || row['systemRole'] || 'teacher').trim();

        if (!prefix || !firstName || !lastName || !email || !employeeId) {
          errors.push({ row: i + 1, message: 'ข้อมูลไม่ครบ (คำนำหน้า, ชื่อ, นามสกุล, อีเมล, รหัสเจ้าหน้าที่)' });
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
          position: position || 'ครู',
          system_role: normalizedRole as 'teacher' | 'admin' | 'superadmin',
        });

        if (result.success) {
          imported++;
        } else {
          errors.push({ row: i + 1, message: result.error?.message || 'บันทึกไม่สำเร็จ' });
        }
      } catch (err) {
        errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด' });
      }
    }

    return { success: true, data: { imported, errors } };
  });
}
