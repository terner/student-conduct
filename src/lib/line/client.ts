/**
 * LINE Messaging API Client
 *
 * Uses LINE Official Account Messaging API to send notifications.
 * Credentials must be set in environment variables:
 * - LINE_CHANNEL_SECRET: Channel secret for webhook signature verification
 * - LINE_CHANNEL_ACCESS_TOKEN: Long-lived channel access token
 */

import { createAdminClient } from '@/lib/supabase/server';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

async function getLineSettingValue(key: string): Promise<unknown> {
  try {
    const supabase = await createAdminClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    return data?.value;
  } catch {
    return undefined;
  }
}

async function getLineSetting(key: string): Promise<string | undefined> {
  const value = await getLineSettingValue(key);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function isLineEnabled() {
  return await getLineSettingValue('line_enabled') !== false;
}

function liffIdFromUrl(url: string | undefined) {
  if (!url) return undefined;
  const match = url.match(/^https:\/\/liff\.line\.me\/([^/?#]+)/i);
  return match?.[1];
}

async function getAccessToken(): Promise<string> {
  const token = await getLineSetting('line_channel_access_token') || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  return token;
}

async function getChannelSecret(): Promise<string> {
  const secret = await getLineSetting('line_channel_secret') || process.env.LINE_CHANNEL_SECRET;
  if (!secret) throw new Error('LINE_CHANNEL_SECRET is not set');
  return secret;
}

export async function getLinePublicConfig() {
  const liffUrl = await getLineRegisterUrl();
  const liffId = await getLineSetting('line_liff_id') || process.env.NEXT_PUBLIC_LIFF_ID || liffIdFromUrl(liffUrl);
  return { liffId, liffUrl };
}

export async function getLineRegisterUrl() {
  const configuredLiffUrl = await getLineSetting('line_liff_url');
  if (configuredLiffUrl) return configuredLiffUrl;
  if (process.env.NEXT_PUBLIC_LIFF_URL) return process.env.NEXT_PUBLIC_LIFF_URL;

  const configuredLiffId = await getLineSetting('line_liff_id');
  if (configuredLiffId) return `https://liff.line.me/${configuredLiffId}`;
  if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/line/register`;
  if (process.env.NEXT_PUBLIC_LIFF_ID) return `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`;
  return undefined;
}

export async function getLineBotInfo(): Promise<{
  success: boolean;
  data?: { basicId?: string; displayName?: string; chatMode?: string; markAsReadMode?: string };
  error?: string;
}> {
  const token = await getAccessToken();
  const response = await fetch(`${LINE_API_BASE}/info`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { success: false, error: `LINE API error: ${response.status}` };
  }
  return { success: true, data };
}

/**
 * Verify webhook signature from LINE
 */
export async function verifyLineSignature(
  body: string,
  signature: string,
): Promise<boolean> {
  const crypto = await import('crypto');
  const secret = await getChannelSecret();
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('base64');
  return signature === expectedSignature;
}

/**
 * Send a push message to a LINE user
 */
export async function sendLineMessage(
  lineUserId: string,
  messages: LineMessage[],
): Promise<{ success: boolean; error?: string }> {
  if (!(await isLineEnabled())) return { success: false, error: 'LINE is disabled' };
  const token = await getAccessToken();

  try {
    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[LINE] Push message failed:', response.status, errorBody);
      return { success: false, error: `LINE API error: ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error('[LINE] Push message error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Reply to a webhook event. Prefer this inside webhook handlers because it
 * doesn't consume push quota for normal user-triggered commands.
 */
export async function replyLineMessage(
  replyToken: string,
  messages: LineMessage[],
): Promise<{ success: boolean; error?: string }> {
  if (!(await isLineEnabled())) return { success: false, error: 'LINE is disabled' };
  const token = await getAccessToken();

  try {
    const response = await fetch(`${LINE_API_BASE}/message/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[LINE] Reply message failed:', response.status, errorBody);
      return { success: false, error: `LINE API error: ${response.status}` };
    }

    return { success: true };
  } catch (err) {
    console.error('[LINE] Reply message error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

function registrationAction(registerUrl?: string) {
  return registerUrl
    ? { type: 'uri', label: 'ลงทะเบียน', uri: registerUrl }
    : { type: 'message', label: 'ลงทะเบียน', text: 'ลงทะเบียน' };
}

export function buildLineRegistrationFlex(registerUrl?: string): LineFlexMessage {
  return {
    type: 'flex',
    altText: 'ลงทะเบียนรับแจ้งเตือนผ่าน LINE',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#16A34A',
        contents: [
          { type: 'text', text: 'ระบบแจ้งเตือนผู้ปกครอง', color: '#FFFFFF', weight: 'bold', size: 'md' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          { type: 'text', text: 'เชื่อมต่อบัญชี LINE กับนักเรียน', weight: 'bold', size: 'lg', wrap: true },
          {
            type: 'text',
            text: 'ลงทะเบียนผ่านปุ่ม หรือพิมพ์ "ลงทะเบียน รหัสนักเรียน เบอร์โทร" เช่น ลงทะเบียน 12345 0812345678',
            size: 'sm',
            color: '#6B7280',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#16A34A',
            action: registrationAction(registerUrl),
          },
          {
            type: 'button',
            style: 'link',
            action: { type: 'message', label: 'ช่วยเหลือ', text: 'ช่วยเหลือ' },
          },
        ],
      },
    },
  };
}

export function buildLineHelpFlex(registerUrl?: string): LineFlexMessage {
  return {
    type: 'flex',
    altText: 'วิธีใช้งาน LINE OA',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2563EB',
        contents: [
          { type: 'text', text: 'วิธีใช้งาน', color: '#FFFFFF', weight: 'bold', size: 'md' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: '1. กดลงทะเบียน หรือพิมพ์ "ลงทะเบียน รหัสนักเรียน เบอร์โทร"', size: 'sm', wrap: true },
          { type: 'text', text: '2. กดคะแนนล่าสุดเพื่อดูคะแนนปัจจุบัน', size: 'sm', wrap: true },
          { type: 'text', text: '3. ระบบจะส่งแจ้งเตือนเมื่อมีรายการสำคัญ', size: 'sm', wrap: true },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#2563EB',
            action: registrationAction(registerUrl),
          },
        ],
      },
    },
  };
}

export function buildLineContactFlex(): LineFlexMessage {
  return {
    type: 'flex',
    altText: 'ติดต่อโรงเรียน',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F766E',
        contents: [
          { type: 'text', text: 'ติดต่อโรงเรียน', color: '#FFFFFF', weight: 'bold', size: 'md' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: 'หากข้อมูลไม่ถูกต้องหรือมีคำถามเพิ่มเติม กรุณาติดต่อครูประจำชั้นหรือฝ่ายปกครอง', size: 'sm', wrap: true },
          { type: 'text', text: 'พิมพ์ "ช่วยเหลือ" เพื่อดูเมนูการใช้งานอีกครั้ง', size: 'xs', color: '#6B7280', wrap: true },
        ],
      },
    },
  };
}

export interface LineStudentScoreSummary {
  studentName: string;
  studentIdNumber: string;
  classroomName: string;
  academicYearName: string;
  baseScore: number;
  currentScore: number;
  totalDeducted: number;
  totalAdded: number;
}

export function buildLineStudentSummaryFlex(
  students: LineStudentScoreSummary[],
  registerUrl?: string,
): LineFlexMessage {
  if (students.length === 0) {
    return buildLineRegistrationFlex(registerUrl);
  }

  return {
    type: 'flex',
    altText: 'คะแนนล่าสุดของนักเรียน',
    contents: {
      type: 'carousel',
      contents: students.slice(0, 5).map((student) => ({
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: student.currentScore < student.baseScore - 40 ? '#DC2626' : '#16A34A',
          contents: [
            { type: 'text', text: 'คะแนนล่าสุด', color: '#FFFFFF', weight: 'bold', size: 'md' },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: student.studentName, weight: 'bold', size: 'lg', wrap: true },
                { type: 'text', text: `${student.classroomName} · ${student.studentIdNumber}`, size: 'xs', color: '#6B7280', wrap: true },
              ],
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: `${student.currentScore} คะแนน`, weight: 'bold', size: 'xxl', color: '#111827' },
                { type: 'text', text: `ปีการศึกษา ${student.academicYearName}`, size: 'xs', color: '#6B7280' },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              spacing: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    { type: 'text', text: 'หัก', size: 'xs', color: '#9CA3AF' },
                    { type: 'text', text: String(student.totalDeducted), weight: 'bold', color: '#DC2626' },
                  ],
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    { type: 'text', text: 'เพิ่ม', size: 'xs', color: '#9CA3AF' },
                    { type: 'text', text: String(student.totalAdded), weight: 'bold', color: '#16A34A' },
                  ],
                },
              ],
            },
          ],
        },
      })),
    },
  };
}

/**
 * Send score deduction notification to parent
 */
export async function sendScoreDeductionNotification(
  lineUserId: string,
  studentName: string,
  points: number,
  categoryName: string,
  note?: string,
) {
  const message: LineFlexMessage = {
    type: 'flex',
    altText: `แจ้งเตือน: ${studentName} ถูกหัก ${Math.abs(points)} คะแนน`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#DC2626',
        contents: [
          {
            type: 'text',
            text: '⚠️ แจ้งเตือนคะแนนความประพฤติ',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'นักเรียน', size: 'xs', color: '#9CA3AF' },
              { type: 'text', text: studentName, weight: 'bold', size: 'md' },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'หมวด', size: 'xs', color: '#9CA3AF' },
              { type: 'text', text: categoryName, size: 'sm' },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'คะแนนที่หัก', size: 'xs', color: '#9CA3AF' },
              {
                type: 'text',
                text: `${points} คะแนน`,
                weight: 'bold',
                size: 'lg',
                color: '#DC2626',
              },
            ],
          },
          ...(note
            ? [
                {
                  type: 'box' as const,
                  layout: 'vertical' as const,
                  contents: [
                    { type: 'text' as const, text: 'หมายเหตุ', size: 'xs' as const, color: '#9CA3AF' as const },
                    { type: 'text' as const, text: note, size: 'sm' as const, wrap: true },
                  ],
                },
              ]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'กรุณาเข้าสู่ระบบเพื่อดูรายละเอียด',
            size: 'xxs',
            color: '#9CA3AF',
            align: 'center',
          },
        ],
      },
    },
  };

  return sendLineMessage(lineUserId, [message]);
}

/**
 * Send attendance notification (absent/late)
 */
export async function sendAttendanceNotification(
  lineUserId: string,
  studentName: string,
  status: 'absent' | 'late',
  date: string,
) {
  const statusText = status === 'absent' ? 'ขาดเรียน' : 'มาสาย';
  const color = status === 'absent' ? '#DC2626' : '#F59E0B';

  const message: LineFlexMessage = {
    type: 'flex',
    altText: `แจ้งเตือน: ${studentName} ${statusText} วันที่ ${date}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: color,
        contents: [
          {
            type: 'text',
            text: `📋 แจ้งเตือน${statusText}`,
            color: '#FFFFFF',
            weight: 'bold',
            size: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'นักเรียน', size: 'xs', color: '#9CA3AF' },
              { type: 'text', text: studentName, weight: 'bold', size: 'md' },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'สถานะ', size: 'xs', color: '#9CA3AF' },
              { type: 'text', text: statusText, weight: 'bold', size: 'lg', color },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: 'วันที่', size: 'xs', color: '#9CA3AF' },
              { type: 'text', text: date, size: 'sm' },
            ],
          },
        ],
      },
    },
  };

  return sendLineMessage(lineUserId, [message]);
}

// Types
export interface LineMessage {
  type: string;
  altText?: string;
  text?: string;
  contents?: unknown;
}

interface LineFlexMessage {
  type: 'flex';
  altText: string;
  contents: unknown;
}
