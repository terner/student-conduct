/**
 * LINE Messaging API Client
 *
 * Uses LINE Official Account Messaging API to send notifications.
 * Credentials must be set in environment variables:
 * - LINE_CHANNEL_SECRET: Channel secret for webhook signature verification
 * - LINE_CHANNEL_ACCESS_TOKEN: Long-lived channel access token
 */

const LINE_API_BASE = 'https://api.line.me/v2/bot';

function getAccessToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
  return token;
}

function getChannelSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) throw new Error('LINE_CHANNEL_SECRET is not set');
  return secret;
}

/**
 * Verify webhook signature from LINE
 */
export async function verifyLineSignature(
  body: string,
  signature: string,
): Promise<boolean> {
  const crypto = await import('crypto');
  const secret = getChannelSecret();
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
  const token = getAccessToken();

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
