import { createAdminClient } from '@/lib/supabase/server';

type JsonRecord = Record<string, unknown>;

function hasApproverRole(role: unknown) {
  const roles = Array.isArray(role) ? role.map(String) : [String(role || '')];
  return roles.includes('admin') || roles.includes('superadmin');
}

function formatStudentName(student: JsonRecord | null | undefined) {
  const profile = student?.profiles as JsonRecord | undefined;
  const prefix = typeof profile?.prefix === 'string' ? profile.prefix : '';
  const fullName = typeof profile?.full_name === 'string' ? profile.full_name : '';
  return `${prefix}${fullName}`.trim() || 'นักเรียน';
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
    const studentName = formatStudentName(student);
    const studentNumber = typeof student?.student_id_number === 'string' ? student.student_id_number : '';
    const classroomName = typeof classroom?.name === 'string' ? classroom.name : '';

    const rows = recipientIds
      .filter((recipientId) => !(existing || []).some((notification) => (
        notification.recipient_id === recipientId
        && metadataMatches(notification.metadata, input.transactionId)
      )))
      .map((recipientId) => ({
        recipient_id: recipientId,
        type: 'score_approval_pending',
        title: 'มีคะแนนรออนุมัติ',
        body: `${studentName}${studentNumber ? ` (${studentNumber})` : ''}${classroomName ? ` ห้อง ${classroomName}` : ''} ${input.points < 0 ? 'ถูกหัก' : 'ได้รับเพิ่ม'} ${Math.abs(input.points)} คะแนน${input.categoryName ? `: ${input.categoryName}` : ''}`,
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
