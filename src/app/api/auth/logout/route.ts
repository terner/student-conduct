import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  // It's ok if signOut() fails (e.g. no valid session) — we still clear the cookie below.
  await supabase.auth.signOut().catch(() => {});

  // Build the redirect URL from the incoming request's origin so we always
  // stay on the same domain (no cross-origin CORS errors).
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl);
  // Clear all auth cookies
  response.cookies.set('supabase.auth.token', '', { maxAge: 0, path: '/' });

  return response;
}
