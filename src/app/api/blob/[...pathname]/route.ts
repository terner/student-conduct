import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/supabase/server';
import { apiMessage } from '@/lib/i18n/api';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ pathname: string[] }> }) {
  const { pathname } = await params;
  const blobPath = pathname.join('/');
  // branding images are public (school logo on login page)
  const isPublic = blobPath.startsWith('branding/');
  if (!isPublic) {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
    }
  }
  const result = await get(blobPath, { access: 'private' });

  if (!result || result.statusCode === 304 || !result.stream) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const headers = new Headers();
  result.headers.forEach((value, key) => headers.set(key, value));
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(result.stream, {
    status: 200,
    headers,
  });
}
