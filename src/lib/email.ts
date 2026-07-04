import { Resend } from 'resend';
import { serverMessage } from '@/lib/i18n/server';

const EMAIL_NOT_CONFIGURED = 'EMAIL_NOT_CONFIGURED';
const EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResendClient();
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return { success: false, error: EMAIL_NOT_CONFIGURED };
  }

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'onboarding@resend.dev',
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error('[Email] Failed:', error);
    return { success: false, error: EMAIL_SEND_FAILED };
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
  const safeStudentName = escapeHtml(studentName);
  const safeTempPassword = escapeHtml(tempPassword);
  return sendEmail({
    to,
    subject: await serverMessage('email.passwordResetSubject'),
    html: `
      <div style="font-family: 'Noto Sans Thai', sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${await serverMessage('email.conductSystemTitle')}</h2>
        <p>${await serverMessage('email.passwordResetIntro', { student: safeStudentName })}</p>
        <div style="background: #f0f0f0; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <code style="font-size: 24px; letter-spacing: 2px;">${safeTempPassword}</code>
        </div>
        <p style="color: #666; font-size: 14px;">
          ${await serverMessage('email.passwordResetHelp')}
        </p>
      </div>
    `,
  });
}
