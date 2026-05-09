import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Operator precedence: `||` has lower precedence than ternary, so this was using VERCEL_URL
  // (auto-generated deployment URL) instead of the custom domain.
  // Fix: explicitly resolve the site URL.
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    || 'http://localhost:3000';
  const response = NextResponse.redirect(new URL('/login', siteUrl));
  // Clear all auth cookies
  response.cookies.set('supabase.auth.token', '', { maxAge: 0, path: '/' });

  return response;
}
