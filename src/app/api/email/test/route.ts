import { NextResponse } from 'next/server';
import { createAdminClient, getUserFromCookie } from '@/lib/supabase/server';
import { apiMessage } from '@/lib/i18n/api';

export async function POST(request: Request) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
  }

  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const roles = Array.isArray(profile?.role) ? profile.role : [profile?.role];
  if (!roles.includes('superadmin')) {
    return NextResponse.json({ error: apiMessage(request, 'forbidden') }, { status: 403 });
  }

  // Get settings
  const { data: settings } = await adminClient
    .from('settings')
    .select('key, value');

  const settingsMap: Record<string, unknown> = {};
  for (const row of settings || []) {
    settingsMap[row.key as string] = row.value;
  }

  const apiKey = String(settingsMap.resend_api_key || process.env.RESEND_API_KEY || '');
  const from = String(settingsMap.resend_from || process.env.RESEND_FROM || 'onboarding@resend.dev');

  if (!apiKey) {
    return NextResponse.json({ error: apiMessage(request, 'resendApiKeyMissing') }, { status: 400 });
  }

  try {
    // Dynamic import resend
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: process.env.RESEND_TEST_TO || 'watkhaowangschool@khaowang.ac.th',
      subject: '🧪 ทดสอบส่งอีเมล — ระบบคะแนนความประพฤติ',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>✅ ทดสอบการส่งอีเมลสำเร็จ</h2>
          <p>ระบบคะแนนความประพฤติ — การตั้งค่า Resend ทำงานถูกต้อง</p>
          <p style="color: #666; font-size: 14px;">ส่งเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : apiMessage(request, 'emailSendFailed') }, { status: 500 });
  }
}
