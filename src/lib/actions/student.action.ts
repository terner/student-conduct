'use server';

import { withAuth, type ActionResult } from '@/lib/server-action';
import { listStudents, getStudentById, createStudent, updateStudent, archiveStudent, getStudentScoreSummary, getStudentEnrollments } from '@/lib/db';
import { studentSchema, paginationSchema, studentImportSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function getStudents(params: {
  page?: number;
  page_size?: number;
  search?: string;
  classroom_id?: string;
  grade_level?: number;
  education_stage?: 'primary' | 'secondary';
  status?: string;
}) {
  return withAuth(async (profile) => {
    const validated = paginationSchema.parse(params);
    const result = await listStudents(validated);
    return { success: true, data: result };
  });
}

export async function getStudent(id: string) {
  return withAuth(async () => {
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
}) {
  return withAuth(async (profile) => {
    // Validate
    const validated = studentSchema.parse(data);

    // XSS check
    const xssCheck = validateXSS({ first_name: validated.first_name, last_name: validated.last_name });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    // Get academic year
    const supabase = await createClient();
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single();

    const result = await createStudent({
      prefix: validated.prefix,
      first_name: validated.first_name,
      last_name: validated.last_name,
      student_id_number: validated.student_id_number,
      classroom_id: validated.classroom_id,
      class_number: validated.class_number,
      academic_year_id: acYear?.id,
      avatar_url: data.avatar_url,
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
}) {
  return withAuth(async (profile) => {
    const xssCheck = validateXSS({ ...data });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    await updateStudent(id, data);
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
  return withAuth(async () => {
    const supabase = await createClient();
    let query = supabase
      .from('classrooms')
      .select('id, name, grade_level, education_stage, academic_year_id')
      .order('grade_level')
      .order('name');

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data } = await query;
    return { success: true, data: data || [] };
  });
}

export async function getAcademicYears() {
  return withAuth(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('academic_years')
      .select('id, name, is_current, base_score')
      .order('name', { ascending: false });
    return { success: true, data: data || [] };
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
      .select('id, student_id_number, profiles!inner(full_name), classrooms!inner(name, grade_level, education_stage)')
      .eq('profile_id', profile.id)
      .single();

    if (!student) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลนักเรียน' } };
    }

    // Get score transactions
    const { data: scores } = await supabase
      .from('score_transactions')
      .select('id, points, status, recorded_at, note, score_categories(name, type), profiles!score_transactions_recorded_by_fkey(full_name)')
      .eq('student_id', student.id)
      .eq('academic_year_id', acYear?.id)
      .eq('status', 'approved')
      .order('recorded_at', { ascending: false });

    const totalDeducted = (scores || []).filter((t: any) => t.points < 0).reduce((s: number, t: any) => s + Math.abs(t.points), 0);
    const totalAdded = (scores || []).filter((t: any) => t.points > 0).reduce((s: number, t: any) => s + t.points, 0);

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          prefix: (student.profiles as any)?.prefix || '',
          full_name: (student.profiles as any)?.full_name || '',
          student_id_number: student.student_id_number,
          classroom_name: (student.classrooms as any)?.name || '',
          grade_level: (student.classrooms as any)?.grade_level,
          education_stage: (student.classrooms as any)?.education_stage,
        },
        summary: {
          current_score: baseScore - totalDeducted + totalAdded,
          total_deducted: totalDeducted,
          total_added: totalAdded,
          base_score: baseScore,
        },
        transactions: (scores || []).map((t: any) => ({
          id: t.id,
          points: t.points,
          note: t.note,
          recorded_at: t.recorded_at,
          category_name: t.score_categories?.name || '',
          category_type: t.score_categories?.type || '',
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
    if (profile.role !== 'admin' && profile.role !== 'teacher') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบและครูเท่านั้นที่สามารถลบข้อมูลนักเรียน' } };
    }

    await archiveStudent(id);
    return { success: true, data: { id } };
  });
}

export async function getStudentListForSelect() {
  return withAuth(async () => {
    const supabase = await createClient();
    const { data } = await supabase
      .from('students')
      .select(`
        id,
        student_id_number,
        profiles!inner(full_name),
        classrooms!inner(name)
      `)
      .eq('current_status', 'active')
      .order('profiles(full_name)');

    return {
      success: true,
      data: (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        student_id_number: s.student_id_number as string,
        full_name: (s.profiles as Record<string, unknown>)?.full_name as string || '',
        classroom_name: (s.classrooms as Record<string, unknown>)?.name as string || '',
      })),
    };
  });
}

/**
 * Import students from CSV data (parsed server-side)
 * Uses admin client to bypass RLS and create auth users
 */
export async function importStudentsCsv(rows: Record<string, unknown>[]) {
  return withAuth(async (profile) => {
    if (profile.role !== 'admin') {
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบ' } };
    }

    const adminClient = await createAdminClient();
    const errors: { row: number; message: string }[] = [];
    let imported = 0;

    // Get current academic year
    const { data: acYear } = await adminClient
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const studentId = String(row['รหัสนักเรียน'] || row['student_id'] || row['student_id_number'] || '');
        const prefix = String(row['คำนำหน้า'] || row['prefix'] || '');
        const firstName = String(row['ชื่อ'] || row['first_name'] || '');
        const lastName = String(row['นามสกุล'] || row['last_name'] || '');
        const gradeLevel = Number(row['ชั้นปี'] || row['grade_level'] || 1);
        const classroomName = String(row['ห้อง'] || row['classroom'] || '');
        const classNum = row['เลขที่ในห้อง'] || row['เลขที่'] || row['class_number'];
        const classNumber = classNum !== undefined && classNum !== '' ? Number(classNum) : undefined;
        const status = String(row['สถานะ'] || row['status'] || 'active');

        if (!studentId || !firstName || !lastName || !classroomName) {
          errors.push({ row: i + 1, message: 'ข้อมูลไม่ครบ (รหัส, ชื่อ, นามสกุล, ห้อง)' });
          continue;
        }

        // Find classroom
        const { data: classroom } = await adminClient
          .from('classrooms')
          .select('id')
          .eq('name', classroomName)
          .eq('grade_level', gradeLevel)
          .maybeSingle();

        if (!classroom) {
          errors.push({ row: i + 1, message: `ไม่พบห้องเรียน "${classroomName}" ชั้นปี ${gradeLevel}` });
          continue;
        }

        // Create auth user
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
          email: `${studentId}@student.school.com`,
          password: 'Student@123',
          email_confirm: true,
          user_metadata: { full_name: `${firstName} ${lastName}`, role: 'student' },
        });

        if (authError || !authUser?.user) {
          errors.push({ row: i + 1, message: 'สร้างบัญชีผู้ใช้ไม่สำเร็จ' });
          continue;
        }

        // Create profile
        const fullName = prefix ? `${prefix}${firstName} ${lastName}` : `${firstName} ${lastName}`;
        const { data: profile } = await adminClient
          .from('profiles')
          .insert({
            user_id: authUser.user.id,
            role: 'student',
            full_name: fullName,
            prefix: prefix || null,
            is_active: status === 'active',
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
            current_status: status === 'active' ? 'active' : 'inactive',
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
          enrollment_status: 'active',
          source: 'annual_import',
        };
        if (classNumber !== undefined) {
          enrollmentData.class_number = classNumber;
        }
        await adminClient.from('student_enrollments').insert(enrollmentData);

        imported++;
      } catch (err) {
        errors.push({ row: i + 1, message: err instanceof Error ? err.message : 'ข้อผิดพลาดไม่ทราบสาเหตุ' });
      }
    }

    return { success: true, data: { imported, errors } };
  });
}
