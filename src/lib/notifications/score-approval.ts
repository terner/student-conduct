import { createAdminClient } from '@/lib/supabase/server';
import { serverMessage } from '@/lib/i18n/server';

type JsonRecord = Record<string, unknown>;

function hasApproverRole(role: unknown) {
  const roles = Array.isArray(role) ? role.map(String) : [String(role || '')];
  return roles.includes('admin') || roles.includes('superadmin');
}

function formatStudentName(student: JsonRecord | null | undefined) {
  const profile = student?.profiles as JsonRecord | undefined;
  const prefix = typeof profile?.prefix === 'string' ? profile.prefix : '';
  const fullName = typeof profile?.full_name === 'string' ? profile.full_name : '';
  return `${prefix}${fullName}`.trim() || undefined;
}

function metadataMatches(metadata: unknown, transactionId: string) {
  if (!metadata || typeof metadata !== 'object') return false;
  return (metadata as JsonRecord).transaction_id === transactionId;
}

export async function notifyScoreApprovalPending(input: {
  transactionId: string;
  studentId: string;
  academicYearId: string;
  points: number;
  categoryName?: string | null;
}) {
  try {
    const adminClient = await createAdminClient();

    const { data: approvers } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('is_active', true);

    const recipientIds = (approvers || [])
      .filter((profile) => hasApproverRole(profile.role))
      .map((profile) => profile.id as string)
      .filter(Boolean);

    if (recipientIds.length === 0) return;

    const { data: existing } = await adminClient
      .from('notifications')
      .select('recipient_id, metadata')
      .eq('type', 'score_approval_pending')
      .in('recipient_id', recipientIds);

    const { data: enrollment } = await adminClient
      .from('student_enrollments')
      .select(`
        students!inner(
          student_id_number,
          profiles!inner(full_name, prefix)
        ),
        classrooms(name)
      `)
      .eq('student_id', input.studentId)
      .eq('academic_year_id', input.academicYearId)
      .maybeSingle();

    const student = enrollment?.students as JsonRecord | undefined;
    const classroom = enrollment?.classrooms as JsonRecord | undefined;
    const studentName = formatStudentName(student) ?? await serverMessage('notifications.studentNameUnavailable');
    const studentNumber = typeof student?.student_id_number === 'string' ? student.student_id_number : '';
    const classroomName = typeof classroom?.name === 'string' ? classroom.name : '';
    const studentDescriptor = studentNumber
      ? await serverMessage('notifications.studentWithNumber', { student: studentName, studentNumber })
      : studentName;
    const classroomDescriptor = classroomName
      ? await serverMessage('notifications.classroomSuffix', { classroom: classroomName })
      : '';
    const pointDirection = input.points < 0
      ? await serverMessage('notifications.pointsDeducted')
      : await serverMessage('notifications.pointsAdded');
    const categoryDescriptor = input.categoryName
      ? await serverMessage('notifications.categorySuffix', { category: input.categoryName })
      : '';
    const title = await serverMessage('notifications.scoreApprovalPendingTitle');
    const body = await serverMessage('notifications.scoreApprovalPendingBody', {
      student: studentDescriptor,
      classroom: classroomDescriptor,
      direction: pointDirection,
      points: Math.abs(input.points),
      category: categoryDescriptor,
    });

    const rows = recipientIds
      .filter((recipientId) => !(existing || []).some((notification) => (
        notification.recipient_id === recipientId
        && metadataMatches(notification.metadata, input.transactionId)
      )))
      .map((recipientId) => ({
        recipient_id: recipientId,
        type: 'score_approval_pending',
        title,
        body,
        resource_type: 'score_transaction',
        resource_id: input.transactionId,
        metadata: {
          transaction_id: input.transactionId,
          student_id: input.studentId,
          academic_year_id: input.academicYearId,
          points: input.points,
          category_name: input.categoryName || null,
        },
      }));

    if (rows.length > 0) {
      await adminClient.from('notifications').insert(rows);
    }
  } catch (error) {
    console.error('[Score Approval Notification] Failed to create notifications:', error);
  }
}

export async function resolveScoreApprovalPendingNotifications(transactionId: string) {
  try {
    const adminClient = await createAdminClient();
    await adminClient
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('type', 'score_approval_pending')
      .contains('metadata', { transaction_id: transactionId });
  } catch (error) {
    console.error('[Score Approval Notification] Failed to resolve notifications:', error);
  }
}
