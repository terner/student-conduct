import { createAdminClient } from '@/lib/supabase/server';
import { sendScoreDeductionNotification, sendAttendanceNotification } from '@/lib/line/client';

/**
 * Send LINE notifications to all linked guardians of a student
 * when a score is recorded (deduction or addition).
 *
 * This is a best-effort function — failures are logged but don't block the score recording.
 */
export async function notifyGuardiansScoreRecorded(params: {
  studentId: string;
  studentName: string;
  points: number;
  categoryName: string;
  note?: string;
  academicYearId?: string;
}) {
  const { studentId, studentName, points, categoryName, note } = params;

  try {
    const supabase = await createAdminClient();

    // Find all active LINE links for this student
    const { data: links } = await supabase
      .from('guardian_line_links')
      .select('id, line_user_id')
      .eq('student_id', studentId)
      .eq('is_active', true);

    if (!links || links.length === 0) {
      // No LINE links — skip silently
      await logLineMessage(supabase, {
        studentId,
        eventType: points < 0 ? 'score_deduction' : 'score_add',
        status: 'not_linked',
        messageText: `No LINE links for student ${studentId}`,
      });
      return;
    }

    // Send to each linked guardian
    for (const link of links) {
      const lineUserId = link.line_user_id as string;
      try {
        if (points < 0) {
          await sendScoreDeductionNotification(
            lineUserId,
            studentName,
            points,
            categoryName,
            note || undefined,
          );
        } else {
          // For score additions, send a simple text message
          const { sendLineMessage } = await import('@/lib/line/client');
          await sendLineMessage(lineUserId, [
            {
              type: 'text',
              text: `✅ ${studentName} ได้รับ +${points} คะแนน\nหมวด: ${categoryName}${note ? `\nหมายเหตุ: ${note}` : ''}`,
            },
          ]);
        }

        await logLineMessage(supabase, {
          studentId,
          lineUserId,
          eventType: points < 0 ? 'score_deduction' : 'score_add',
          status: 'sent',
          messageText: `Sent to ${lineUserId}: ${studentName} ${points}pts ${categoryName}`,
        });
      } catch (err) {
        console.error(`[LINE Notify] Failed to send to ${lineUserId}:`, err);
        await logLineMessage(supabase, {
          studentId,
          lineUserId,
          eventType: points < 0 ? 'score_deduction' : 'score_add',
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  } catch (err) {
    console.error('[LINE Notify] Error:', err);
  }
}

/**
 * Send LINE notification for attendance (absent/late)
 */
export async function notifyGuardiansAttendance(params: {
  studentId: string;
  studentName: string;
  status: 'absent' | 'late';
  date: string;
}) {
  const { studentId, studentName, status, date } = params;

  try {
    const supabase = await createAdminClient();

    const { data: links } = await supabase
      .from('guardian_line_links')
      .select('id, line_user_id')
      .eq('student_id', studentId)
      .eq('is_active', true);

    if (!links || links.length === 0) {
      await logLineMessage(supabase, {
        studentId,
        eventType: status === 'absent' ? 'attendance_absent' : 'attendance_late',
        status: 'not_linked',
      });
      return;
    }

    for (const link of links) {
      const lineUserId = link.line_user_id as string;
      try {
        await sendAttendanceNotification(lineUserId, studentName, status, date);
        await logLineMessage(supabase, {
          studentId,
          lineUserId,
          eventType: status === 'absent' ? 'attendance_absent' : 'attendance_late',
          status: 'sent',
        });
      } catch (err) {
        console.error(`[LINE Notify] Attendance notify failed for ${lineUserId}:`, err);
        await logLineMessage(supabase, {
          studentId,
          lineUserId,
          eventType: status === 'absent' ? 'attendance_absent' : 'attendance_late',
          status: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  } catch (err) {
    console.error('[LINE Notify] Attendance error:', err);
  }
}

async function logLineMessage(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  params: {
    studentId: string;
    lineUserId?: string;
    eventType: string;
    status: string;
    messageText?: string;
    errorMessage?: string;
  },
) {
  try {
    await supabase.from('line_message_logs').insert({
      line_user_id: params.lineUserId || 'unknown',
      student_id: params.studentId,
      event_type: params.eventType,
      message_text: params.messageText || null,
      status: params.status,
      error_message: params.errorMessage || null,
    });
  } catch {
    // Best-effort logging — don't throw
  }
}
