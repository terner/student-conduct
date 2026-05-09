import { createClient as createSupabaseClient, type User, type SupabaseClient } from '@supabase/supabase-js';
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
    const decoded = Buffer.from(standard, 'base64').toString('utf-8');
    // Validate JSON
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}

// Internal helper to build a client and optionally resolve the session
async function buildClient(): Promise<{
  supabase: SupabaseClient<any, 'public', any>;
  user: User | null;
}> {
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

  let user: User | null = null;

  // setSession() validates/refreshes the token AND returns the user.
  // This avoids a redundant getUser() call later.
  if (session?.access_token) {
    const { data } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    user = data?.session?.user ?? null;
  }

  return { supabase, user };
}

/**
 * Create a Supabase client for server-side usage (Server Components, Route Handlers, Server Actions).
 *
 * Reads the session from the `supabase.auth.token` cookie and sets it on the client.
 * This avoids the @supabase/ssr cookie chunking issues and works reliably.
 */
export async function createClient(): Promise<SupabaseClient<any, 'public', any>> {
  const { supabase } = await buildClient();
  return supabase;
}

/**
 * Like createClient() but also returns the authenticated user in one call,
 * avoiding a redundant getUser() call (setSession() already returns the user).
 */
export async function createClientWithUser(): Promise<{
  supabase: SupabaseClient<any, 'public', any>;
  user: User | null;
}> {
  return buildClient();
}

/**
 * Create a Supabase admin client using the service role key for operations
 * that bypass RLS (e.g., storage admin, user management).
 */
export async function createAdminClient(): Promise<SupabaseClient<any, 'public', any>> {
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}
