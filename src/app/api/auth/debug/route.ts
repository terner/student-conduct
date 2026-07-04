import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { apiMessage } from '@/lib/i18n/api';

function decodeBase64URL(value: string): string | null {
  if (!value.startsWith('base64-')) return null;
  try {
    const b64 = value.slice(7);
    const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(standard);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    const decoded = new TextDecoder().decode(bytes);
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}

interface DecodedSession {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

type ManualDecodeResult =
  | {
      valid: boolean;
      hasAccessToken: boolean;
      tokenPreview?: string;
      expiresAt: string | null;
    }
  | { valid: false; error: string }
  | null;

interface AuthProbeResult {
  user?: string | null;
  found?: boolean;
  error: string | null;
}

interface SetSessionProbeResult {
  success: boolean;
  error: string | null;
  sessionUser?: string | null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function apiDebugError(request: Request) {
  return apiMessage(request, 'genericTryAgain');
}

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';

  // Manual parse
  const manualCookies = cookieHeader.split('; ').filter(Boolean).map(c => {
    const [name, ...rest] = c.split('=');
    return { name: name?.trim() || '', value: rest.join('=') || '' };
  });

  const authCookie = manualCookies.find(c => c.name === 'supabase.auth.token');

  // ============================================
  // TEST 1: Manual decode
  // ============================================
  let manualDecode: ManualDecodeResult = null;
  let session: DecodedSession | null = null;
  if (authCookie) {
    const decoded = decodeBase64URL(authCookie.value);
    if (decoded) {
      try {
        const parsedSession = JSON.parse(decoded) as DecodedSession;
        session = parsedSession;
        manualDecode = {
          valid: !!(parsedSession.access_token && parsedSession.refresh_token && parsedSession.expires_at),
          hasAccessToken: !!parsedSession.access_token,
          tokenPreview: parsedSession.access_token?.substring(0, 20),
          expiresAt: parsedSession.expires_at ? new Date(parsedSession.expires_at * 1000).toISOString() : null,
        };
      } catch {
        manualDecode = { valid: false, error: apiMessage(request, 'debugJsonParseFailed') };
      }
    } else {
      manualDecode = { valid: false, error: apiMessage(request, 'debugBase64DecodeFailed') };
    }
  }

  // ============================================
  // TEST 2: OLD approach — @supabase/ssr createServerClient
  // ============================================
  let getAllCallCount = 0;
  const ssrSupabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          getAllCallCount++;
          return manualCookies;
        },
        setAll() {},
      },
    }
  );

  const ssrGetUser: AuthProbeResult = await ssrSupabase.auth.getUser()
    .then(r => ({ user: r.data?.user?.id || null, error: r.error ? apiDebugError(request) : null }))
    .catch(e => {
      console.error('[Auth Debug API] SSR getUser failed:', errorMessage(e));
      return { user: null, error: apiDebugError(request) };
    });

  const ssrGetSession: AuthProbeResult = await ssrSupabase.auth.getSession()
    .then(r => ({ found: !!r.data?.session, error: r.error ? apiDebugError(request) : null }))
    .catch(e => {
      console.error('[Auth Debug API] SSR getSession failed:', errorMessage(e));
      return { found: false, error: apiDebugError(request) };
    });

  // ============================================
  // TEST 3: NEW approach — @supabase/supabase-js + setSession
  // ============================================
  let customGetUser: AuthProbeResult | null = null;
  let customGetSession: AuthProbeResult | null = null;
  let setSessionResult: SetSessionProbeResult | null = null;

  try {
    const customSupabase = createSupabaseClient(
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

    if (session?.access_token) {
      const { data: ssData, error: ssError } = await customSupabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token || '',
      });
      setSessionResult = {
        success: !!ssData?.session,
        error: ssError ? apiDebugError(request) : null,
        sessionUser: ssData?.session?.user?.id || null,
      };
    } else {
      setSessionResult = { success: false, error: apiMessage(request, 'debugNoSessionToSet'), sessionUser: null };
    }

    customGetUser = await customSupabase.auth.getUser()
      .then(r => ({ user: r.data?.user?.id || null, error: r.error ? apiDebugError(request) : null }))
      .catch(e => {
        console.error('[Auth Debug API] custom getUser failed:', errorMessage(e));
        return { user: null, error: apiDebugError(request) };
      });

    customGetSession = await customSupabase.auth.getSession()
      .then(r => ({ found: !!r.data?.session, error: r.error ? apiDebugError(request) : null }))
      .catch(e => {
        console.error('[Auth Debug API] custom getSession failed:', errorMessage(e));
        return { found: false, error: apiDebugError(request) };
      });
  } catch (e) {
    console.error('[Auth Debug API] custom probe failed:', errorMessage(e));
    const message = apiDebugError(request);
    customGetUser = { user: null, error: message };
    customGetSession = { found: false, error: message };
    if (!setSessionResult) setSessionResult = { success: false, error: message };
  }

  // ============================================
  // RESULTS
  // ============================================
  return NextResponse.json({
    cookie: {
      present: !!authCookie,
      prefix: authCookie?.value?.substring(0, 40),
      length: authCookie?.value?.length,
    },
    manualDecode,
    old_ssr: {
      getAllCallCount,
      getUser: ssrGetUser,
      getSession: ssrGetSession,
    },
    new_custom: {
      setSession: setSessionResult,
      getUser: customGetUser,
      getSession: customGetSession,
    },
  });
}
