import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const publicRoutes = ['/login', '/pdpa-consent', '/pdpa-rejected', '/change-password'];
const adminOnlyRoutes = ['/teachers', '/settings'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and static files
  if (publicRoutes.some(r => pathname.startsWith(r)) || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/api') ||
      pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Create Supabase client
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 🔧 DEV MODE: Bypass all auth checks
  // TODO: Re-enable before production
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
