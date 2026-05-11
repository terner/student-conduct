import { createAdminClient } from '@/lib/supabase/server';

type ThresholdRule = {
  deducted: number;
  action?: string;
  color?: string;
};

type JsonRecord = Record<string, unknown>;

function hasRole(role: unknown, target: string) {
  if (Array.isArray(role)) return role.includes(target);
  return role === target;
}

function formatStudentName(student: JsonRecord | null | undefined) {
  const profile = student?.profiles as JsonRecord | undefined;
  const prefix = typeof profile?.prefix === 'string' ? profile.prefix : '';
  const fullName = typeof profile?.full_name === 'string' ? profile.full_name : '';
  return `${prefix}${fullName}`.trim() || 'นักเรียน';
}

function metadataMatches(metadata: unknown, expected: {
  studentId: string;
  academicYearId: string;
  thresholdLevel: number;
}) {
  if (!metadata || typeof metadata !== 'object') return false;
  const value = metadata as JsonRecord;
  return value.student_id === expected.studentId
    && value.academic_year_id === expected.academicYearId
    && value.threshold_level === expected.thresholdLevel;
}

export async function notifyThresholdReached(input: {
  studentId: string;
  academicYearId: string;
  transactionId?: string;
}) {
  try {
    const adminClient = await createAdminClient();

    const { data: currentYear } = await adminClient
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    if (!currentYear?.id || currentYear.id !== input.academicYearId) return;

    const { data: settings } = await adminClient
      .from('settings')
      .select('value')
      .eq('key', 'thresholds')
      .maybeSingle();

    const thresholds = ((settings?.value as ThresholdRule[] | null) || [])
      .filter((threshold) => Number.isFinite(Number(threshold.deducted)))
      .sort((a, b) => Number(a.deducted) - Number(b.deducted));

    if (thresholds.length === 0) return;

    const { data: transactions } = await adminClient
      .from('score_transactions')
      .select('points')
      .eq('student_id', input.studentId)
      .eq('academic_year_id', input.academicYearId)
      .eq('status', 'approved');

    const totalDeducted = (transactions || [])
      .filter((transaction) => Number(transaction.points) < 0)
      .reduce((sum, transaction) => sum + Math.abs(Number(transaction.points) || 0), 0);
    const totalAdded = (transactions || [])
      .filter((transaction) => Number(transaction.points) > 0)
      .reduce((sum, transaction) => sum + (Number(transaction.points) || 0), 0);
    const currentScore = 100 - totalDeducted + totalAdded;
    const reached = thresholds
      .map((threshold, index) => ({ ...threshold, level: index + 1 }))
      .filter((threshold) => totalDeducted >= Number(threshold.deducted));

    if (reached.length === 0) return;

    const { data: enrollment } = await adminClient
      .from('student_enrollments')
      .select(`
        classroom_id,
        students!inner(
          student_id_number,
          profiles!inner(full_name, prefix)
        ),
        classrooms(name)
      `)
      .eq('student_id', input.studentId)
      .eq('academic_year_id', input.academicYearId)
      .maybeSingle();

    const classroomId = enrollment?.classroom_id as string | undefined;
    const student = enrollment?.students as JsonRecord | undefined;
    const studentName = formatStudentName(student);
    const studentNumber = typeof student?.student_id_number === 'string' ? student.student_id_number : '';
    const classroom = enrollment?.classrooms as JsonRecord | undefined;
    const classroomName = typeof classroom?.name === 'string' ? classroom.name : '';

    const { data: adminProfiles } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('is_active', true);

    const recipients = new Set<string>(
      (adminProfiles || [])
        .filter((profile) => hasRole(profile.role, 'admin') || hasRole(profile.role, 'superadmin'))
        .map((profile) => profile.id as string)
        .filter(Boolean),
    );

    if (classroomId) {
      const { data: assignments } = await adminClient
        .from('teacher_classrooms')
        .select('assignment_role, teachers!inner(profile_id)')
        .eq('classroom_id', classroomId)
        .in('assignment_role', ['homeroom', 'assistant']);

      for (const assignment of assignments || []) {
        const teacherValue = assignment.teachers as unknown;
        const teacher = Array.isArray(teacherValue) ? teacherValue[0] as JsonRecord | undefined : teacherValue as JsonRecord | undefined;
        if (typeof teacher?.profile_id === 'string') recipients.add(teacher.profile_id);
      }
    }

    const recipientIds = Array.from(recipients);
    if (recipientIds.length === 0) return;

    const { data: existing } = await adminClient
      .from('notifications')
      .select('recipient_id, metadata')
      .eq('type', 'threshold_reached')
      .in('recipient_id', recipientIds);

    const rows = [];
    for (const threshold of reached) {
      for (const recipientId of recipientIds) {
        const duplicate = (existing || []).some((notification) => (
          notification.recipient_id === recipientId
          && metadataMatches(notification.metadata, {
            studentId: input.studentId,
            academicYearId: input.academicYearId,
            thresholdLevel: threshold.level,
          })
        ));
        if (duplicate) continue;

        rows.push({
          recipient_id: recipientId,
          type: 'threshold_reached',
          title: `นักเรียนถึงเกณฑ์ระดับ ${threshold.level}`,
          body: `${studentName}${studentNumber ? ` (${studentNumber})` : ''}${classroomName ? ` ห้อง ${classroomName}` : ''} ถูกหักสะสม ${totalDeducted} คะแนน`,
          resource_type: 'student',
          resource_id: input.studentId,
          metadata: {
            student_id: input.studentId,
            academic_year_id: input.academicYearId,
            classroom_id: classroomId || null,
            threshold_level: threshold.level,
            threshold_deducted: threshold.deducted,
            threshold_action: threshold.action || '',
            deducted_total: totalDeducted,
            current_score: currentScore,
            transaction_id: input.transactionId || null,
          },
        });
      }
    }

    if (rows.length > 0) {
      await adminClient.from('notifications').insert(rows);
    }
  } catch (error) {
    console.error('[Threshold Notification] Failed to create notifications:', error);
  }
}
