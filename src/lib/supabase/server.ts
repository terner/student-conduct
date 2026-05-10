import { createClient as createSupabaseClient, type User, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const BASE64_PREFIX = 'base64-';

interface CookieSession {
  access_token?: string;
  refresh_token?: string;
}

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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const standard = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(standard, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

function isCookieSession(value: unknown): value is CookieSession {
  return typeof value === 'object' && value !== null;
}

async function getSessionFromCookie(): Promise<CookieSession | null> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('supabase.auth.token');
  if (!authCookie) return null;
  const decoded = decodeCookieValue(authCookie.value);
  if (!decoded) return null;
  try {
    const parsed: unknown = JSON.parse(decoded);
    return isCookieSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function getUserFromCookie(): Promise<{ id: string; email?: string } | null> {
  const session = await getSessionFromCookie();
  if (!session?.access_token) return null;
  const payload = decodeJwtPayload(session.access_token);
  const id = payload?.sub;
  if (typeof id !== 'string') return null;
  return {
    id,
    email: typeof payload?.email === 'string' ? payload.email : undefined,
  };
}

// Internal helper to build a client and optionally resolve the session
async function buildClient(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  const session = await getSessionFromCookie();

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
  if (session?.access_token && session.refresh_token) {
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
export async function createClient(): Promise<SupabaseClient> {
  const { supabase } = await buildClient();
  return supabase;
}

/**
 * Like createClient() but also returns the authenticated user in one call,
 * avoiding a redundant getUser() call (setSession() already returns the user).
 */
export async function createClientWithUser(): Promise<{
  supabase: SupabaseClient;
  user: User | null;
}> {
  return buildClient();
}

/**
 * Create a Supabase admin client using the service role key for operations
 * that bypass RLS (e.g., storage admin, user management).
 */
export async function createAdminClient(): Promise<SupabaseClient> {
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
