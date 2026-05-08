'use server';

import { withAuth } from '@/lib/server-action';
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

export async function getTeachers(params?: { search?: string; department?: string }) {
  return withAuth(async () => {
    const result = await listTeachers(params);
    return { success: true, data: result };
  });
}

export async function getTeacher(id: string) {
  return withAuth(async () => {
    const teacher = await getTeacherById(id);
    if (!teacher) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลครู' } };
    }
    return { success: true, data: teacher };
  });
}

export async function addTeacher(data: {
  first_name: string;
  last_name: string;
  email: string;
  employee_id: string;
  department?: string;
}) {
  return withAuth(async (profile) => {
    if (profile.role !== 'admin') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบ' } };
    }

    const validated = teacherSchema.parse(data);

    const xssCheck = validateXSS({
      first_name: validated.first_name,
      last_name: validated.last_name,
      department: validated.department || '',
    });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    const result = await createTeacher(validated);
    return { success: true, data: result };
  });
}

export async function editTeacher(id: string, data: {
  first_name?: string;
  last_name?: string;
  employee_id?: string;
  department?: string;
  is_active?: boolean;
}) {
  return withAuth(async (profile) => {
    if (profile.role !== 'admin') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบ' } };
    }

    await updateTeacher(id, data);
    return { success: true, data: { id } };
  });
}

export async function assignClassroom(data: {
  teacher_id: string;
  classroom_id: string;
  assignment_role?: string;
}) {
  return withAuth(async (profile) => {
    if (profile.role !== 'admin') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบ' } };
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
    if (profile.role !== 'admin') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบ' } };
    }

    await removeTeacherFromClassroom(teacherId, classroomId);
    return { success: true, data: null };
  });
}
