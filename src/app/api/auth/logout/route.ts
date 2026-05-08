import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'));
  response.cookies.set('sb-auth-token', '', { maxAge: 0, path: '/' });

  return response;
}
