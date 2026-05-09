import { type NextRequest, NextResponse } from 'next/server';

const BASE64_PREFIX = 'base64-';

function decodeSessionCookie(value: string): { user_id?: string } | null {
  if (!value.startsWith(BASE64_PREFIX)) return null;
  try {
    const b64 = value.slice(BASE64_PREFIX.length);
    const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(standard, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

const publicRoutes = ['/login', '/pdpa-consent', '/pdpa-rejected', '/change-password'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes, static files, and API routes (no auth needed in dev)
  if (publicRoutes.some(r => pathname.startsWith(r)) ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get('supabase.auth.token');
  const session = authCookie ? decodeSessionCookie(authCookie.value) : null;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Set locale cookie if not set
  const response = NextResponse.next();
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (!localeCookie) {
    response.cookies.set('NEXT_LOCALE', 'th', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
