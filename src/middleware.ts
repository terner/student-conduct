import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const publicRoutes = ['/login', '/pdpa-consent', '/pdpa-rejected', '/change-password'];
const studentRoutes = ['/student'];
const adminTeacherRoutes = ['/dashboard', '/students', '/classrooms', '/score', '/reports', '/teachers', '/settings'];
const adminOnlyRoutes = ['/teachers', '/settings'];

export async function middleware(request: NextRequest) {
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // No user → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active, must_change_password')
    .eq('user_id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Check must_change_password
  if (profile.must_change_password && pathname !== '/change-password') {
    const url = request.nextUrl.clone();
    url.pathname = '/change-password';
    return NextResponse.redirect(url);
  }

  // Check PDPA consent (skip for PDPA routes)
  if (pathname !== '/pdpa-consent' && pathname !== '/pdpa-rejected') {
    const { data: consent } = await supabase
      .from('pdpa_consents')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('accepted', true)
      .maybeSingle();

    if (!consent) {
      const url = request.nextUrl.clone();
      url.pathname = '/pdpa-consent';
      return NextResponse.redirect(url);
    }
  }

  // Role-based route access
  if (profile.role === 'student') {
    if (!pathname.startsWith('/student')) {
      const url = request.nextUrl.clone();
      url.pathname = '/student/dashboard';
      return NextResponse.redirect(url);
    }
  } else if (profile.role === 'teacher') {
    if (pathname.startsWith('/student')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
    // Teachers can't access admin-only routes
    if (adminOnlyRoutes.some(r => pathname.startsWith(r))) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  } else if (profile.role === 'admin') {
    if (pathname.startsWith('/student')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
