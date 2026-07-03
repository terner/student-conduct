import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return { success: false, error: 'Email not configured' };
  }

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'onboarding@resend.dev',
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error('[Email] Failed:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Send password reset email to a student
 */
export async function sendPasswordResetEmail(
  to: string,
  studentName: string,
  tempPassword: string,
) {
  return sendEmail({
    to,
    subject: 'รหัสผ่านชั่วคราว — ระบบคะแนนความประพฤติ',
    html: `
      <div style="font-family: 'Noto Sans Thai', sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>ระบบคะแนนความประพฤติ</h2>
        <p>รหัสผ่านชั่วคราวสำหรับ <strong>${studentName}</strong>:</p>
        <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <code style="font-size: 24px; letter-spacing: 2px;">${tempPassword}</code>
        </div>
        <p style="color: #666; font-size: 14px;">
          เมื่อเข้าสู่ระบบครั้งแรก ระบบจะให้เปลี่ยนรหัสผ่านใหม่
        </p>
      </div>
    `,
  });
}
