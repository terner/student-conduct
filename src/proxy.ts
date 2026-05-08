import { type NextRequest, NextResponse } from 'next/server';

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

  // 🔧 DEV MODE: Allow all page access without auth
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
