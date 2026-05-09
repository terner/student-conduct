import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const BASE64_PREFIX = 'base64-';

/**
 * Decode a cookie value that was encoded with base64url prefix
 */
function decodeCookieValue(value: string): string | null {
  if (!value.startsWith(BASE64_PREFIX)) return null;
  try {
    const b64 = value.slice(BASE64_PREFIX.length);
    // Convert base64url to base64
    const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(standard);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    const decoded = new TextDecoder().decode(bytes);
    // Validate JSON
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Create a Supabase client for server-side usage (Server Components, Route Handlers, Server Actions).
 *
 * Reads the session from the `supabase.auth.token` cookie and sets it on the client.
 * This avoids the @supabase/ssr cookie chunking issues and works reliably.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Try to find and decode the auth token cookie
  const authCookie = allCookies.find(c => c.name === 'supabase.auth.token');
  let session: any = null;
  if (authCookie) {
    const decoded = decodeCookieValue(authCookie.value);
    if (decoded) {
      try {
        session = JSON.parse(decoded);
      } catch { /* invalid session */ }
    }
  }

  const supabase = createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    }
  );

  // If we found a session, set it on the client
  if (session?.access_token) {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  }

  return supabase;
}
