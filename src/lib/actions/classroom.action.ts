'use server';

import { withAuth, type ActionResult } from '@/lib/server-action';
import { listClassrooms, getClassroomById, createClassroom, updateClassroom, deleteClassroom } from '@/lib/db';
import { classroomSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { createClient } from '@/lib/supabase/server';

export async function getClassrooms(params?: {
  education_stage?: 'primary' | 'secondary';
  grade_level?: number;
}) {
  return withAuth(async () => {
    const result = await listClassrooms(params);
    return { success: true, data: result };
  });
}

export async function getClassroom(id: string) {
  return withAuth(async () => {
    const classroom = await getClassroomById(id);
    if (!classroom) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบห้องเรียน' } };
    }
    return { success: true, data: classroom };
  });
}

export async function addClassroom(data: {
  name: string;
  education_stage: 'primary' | 'secondary';
  grade_level: number;
}) {
  return withAuth(async () => {
    const validated = classroomSchema.parse(data);

    const xssCheck = validateXSS({ name: validated.name });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    const supabase = await createClient();
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single();

    const result = await createClassroom({
      ...validated,
      academic_year_id: acYear?.id || '',
    });

    return { success: true, data: result };
  });
}

export async function editClassroom(id: string, data: {
  name?: string;
  education_stage?: 'primary' | 'secondary';
  grade_level?: number;
}) {
  return withAuth(async (profile) => {
    if (profile.role !== 'admin') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบ' } };
    }

    await updateClassroom(id, data as any);
    return { success: true, data: { id } };
  });
}

export async function removeClassroom(id: string) {
  return withAuth(async (profile) => {
    if (profile.role !== 'admin') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบ' } };
    }

    try {
      await deleteClassroom(id);
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
