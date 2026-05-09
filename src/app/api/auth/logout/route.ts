import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Use a relative redirect so the browser stays on the same origin.
  // Previously used an absolute URL that resolved to the auto-generated
  // Vercel preview URL (student-conduct-xxxxx.vercel.app), which caused
  // cross-origin CORS errors when the user was on the custom domain.
  const response = NextResponse.redirect('/login');
  // Clear all auth cookies
  response.cookies.set('supabase.auth.token', '', { maxAge: 0, path: '/' });

  return response;
}
