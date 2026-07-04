import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getUserFromCookie } from '@/lib/supabase/server';
import { apiMessage } from '@/lib/i18n/api';

export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: Promise<{ pathname: string[] }> }) {
  const { pathname } = await params;
  const blobPath = pathname.join('/');
  if (!blobPath) {
    return NextResponse.json({ error: apiMessage(request, 'notFound') }, { status: 404 });
  }

  // branding images are public (school logo on login page)
  const isPublic = blobPath.startsWith('branding/');
  if (!isPublic) {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
    }
  }

  let result: Awaited<ReturnType<typeof get>> | null = null;
  try {
    result = await get(blobPath, { access: 'private' });
  } catch (error) {
    console.warn('[Blob] Unable to read file:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: apiMessage(request, 'notFound') }, { status: 404 });
  }

  if (!result || result.statusCode === 304 || !result.stream) {
    return NextResponse.json({ error: apiMessage(request, 'notFound') }, { status: 404 });
  }

  const headers = new Headers();
  result.headers.forEach((value, key) => headers.set(key, value));
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(result.stream, {
    status: 200,
    headers,
  });
}
