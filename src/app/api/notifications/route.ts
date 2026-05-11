import { NextRequest, NextResponse } from 'next/server';
import { createClientWithUser, createClient } from '@/lib/supabase/server';
import { apiMessage } from '@/lib/i18n/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { supabase, user } = await createClientWithUser();

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json(
    { data: notifications ?? [] },
    { status: 200 },
  );
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await createClientWithUser();

  if (!user?.id) {
    return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: apiMessage(request, 'forbidden') }, { status: 403 });
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: apiMessage(request, 'invalidJson') }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: apiMessage(request, 'missingNotificationId') }, { status: 400 });
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', body.id)
    .eq('recipient_id', profile.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
