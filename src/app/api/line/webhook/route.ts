import { NextRequest, NextResponse } from 'next/server';
import { verifyLineSignature } from '@/lib/line/client';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * LINE Webhook Handler
 *
 * Receives events from LINE Messaging API:
 * - Follow events: User adds the OA → show registration prompt
 * - Unfollow events: User removes the OA → mark as unlinked
 * - Message events: Handle quick replies
 *
 * Setup:
 * 1. Set LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN in Vercel env
 * 2. Set webhook URL in LINE Developers Console: https://your-domain.com/api/line/webhook
 * 3. Enable "Use webhook" in LINE Developers Console
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature') || '';

    // Verify signature
    const isValid = await verifyLineSignature(body, signature);
    if (!isValid) {
      console.error('[LINE Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookEvent = JSON.parse(body);
    const events = webhookEvent.events || [];

    for (const event of events) {
      await handleEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[LINE Webhook] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function handleEvent(event: Record<string, unknown>) {
  const type = event.type as string;
  const userId = (event.source as Record<string, unknown>)?.userId as string;

  if (!userId) return;

  const supabase = await createAdminClient();

  switch (type) {
    case 'follow': {
      // User added the OA → send welcome message with registration link
      const liiffUrl = process.env.NEXT_PUBLIC_LIFF_URL || `${process.env.NEXT_PUBLIC_SITE_URL || ''}/line/register`;
      const { sendLineMessage } = await import('@/lib/line/client');
      await sendLineMessage(userId, [
        {
          type: 'text',
          text: `สวัสดีครับ! 👋\nยินดีต้อนรับสู่ระบบแจ้งเตือนคะแนนความประพฤติ\n\nกรุณากดลงทะเบียนเพื่อเชื่อมต่อบัญชี:\n${liiffUrl}`,
        },
      ]);
      break;
    }

    case 'unfollow': {
      // User removed the OA → mark LINE user as inactive
      await supabase
        .from('guardian_line_links')
        .update({ is_active: false })
        .eq('line_user_id', userId);
      break;
    }

    case 'message': {
      // Handle text messages (basic auto-reply)
      const message = event.message as Record<string, unknown>;
      if (message?.type === 'text') {
        const text = (message.text as string)?.trim().toLowerCase();
        if (text === 'help' || text === 'ช่วยเหลือ') {
          const { sendLineMessage } = await import('@/lib/line/client');
          await sendLineMessage(userId, [
            {
              type: 'text',
              text: '📋 วิธีใช้งาน:\n\n1. กดเมนู "ลงทะเบียน" เพื่อเชื่อมต่อบัญชี\n2. ระบบจะแจ้งเตือนเมื่อนักเรียนถูกหักคะแนน\n3. ระบบจะแจ้งเตือนเมื่อนักเรียนขาดเรียน/มาสาย\n\nต้องการความช่วยเหลือเพิ่มเติม กรุณาติดต่อโรงเรียน',
            },
          ]);
        }
      }
      break;
    }
  }
}
