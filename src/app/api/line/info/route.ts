import { NextResponse } from 'next/server';
import { apiMessage } from '@/lib/i18n/api';
import { getLineBotInfo } from '@/lib/line/client';
import { getRoles } from '@/lib/security/roles';
import { createAdminClient, getUserFromCookie } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ success: false, error: apiMessage(request, 'unauthorized') }, { status: 401 });
  }

  const adminClient = await createAdminClient();
  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ success: false, error: apiMessage(request, 'databaseError') }, { status: 500 });
  }

  if (!profile || !getRoles(profile).includes('superadmin')) {
    return NextResponse.json({ success: false, error: apiMessage(request, 'forbidden') }, { status: 403 });
  }

  try {
    const result = await getLineBotInfo();
    if (!result.success) {
      return NextResponse.json({ success: false, error: apiMessage(request, 'genericTryAgain') }, { status: 502 });
    }
    return NextResponse.json({
      success: true,
      data: {
        basicId: result.data?.basicId,
        displayName: result.data?.displayName,
        chatMode: result.data?.chatMode,
        markAsReadMode: result.data?.markAsReadMode,
      },
    });
  } catch (error) {
    console.error('[LINE Info API] Failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: apiMessage(request, 'genericTryAgain') }, { status: 500 });
  }
}
