import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split('; ').filter(Boolean).map(c => {
    const [name, ...rest] = c.split('=');
    return { name, value: rest.join('=') };
  });
  
  // Try getUser with the proxy-style client
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookies;
        },
        setAll() {},
      },
    }
  );

  let userResult = null;
  let userError = null;
  try {
    const result = await supabase.auth.getUser();
    userResult = result.data?.user?.id || null;
    userError = result.error?.message || null;
  } catch (e: any) {
    userError = e.message;
  }

  // Also try getSession
  let sessionResult = null;
  let sessionError = null;
  try {
    const result = await supabase.auth.getSession();
    sessionResult = result.data?.session ? 'found' : 'not found';
    sessionError = result.error?.message || null;
  } catch (e: any) {
    sessionError = e.message;
  }

  return NextResponse.json({
    hasCookie: !!cookieHeader,
    cookieCount: cookies.length,
    cookieNames: cookies.map(c => c.name),
    supabaseUrl: process.env.SUPABASE_URL?.slice(0, 30) + '...',
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    getUser: userResult,
    getUserError: userError,
    getSession: sessionResult,
    sessionError,
    anonKeyPrefix: process.env.SUPABASE_ANON_KEY?.substring(0, 10) + '...',
  });
}
