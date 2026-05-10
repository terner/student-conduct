'use server';

import { withAuth } from '@/lib/server-action';
import { canManageSchoolData } from '@/lib/security/roles';
import {
  listTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  assignTeacherToClassroom,
  removeTeacherFromClassroom,
} from '@/lib/db';
import { teacherSchema, teacherClassroomSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';

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

export async function addTeacher(data: {
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
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    const validated = teacherSchema.parse(data);

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

    await updateTeacher(id, data);
    return { success: true, data: { id } };
  });
}

export async function setTeacherActive(id: string, isActive: boolean) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    await updateTeacher(id, { is_active: isActive });
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

    return { success: true, data: null };
  });
}

export async function unassignClassroom(teacherId: string, classroomId: string) {
  return withAuth(async (profile) => {
    if (!canManageSchoolData(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลสูงสุด' } };
    }

    await removeTeacherFromClassroom(teacherId, classroomId);
    return { success: true, data: null };
  });
}
