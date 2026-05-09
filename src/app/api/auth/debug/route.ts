import { createServerClient, combineChunks } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
  let manualDecode: any = null;
  let session: any = null;
  if (authCookie) {
    const decoded = decodeBase64URL(authCookie.value);
    if (decoded) {
      try {
        session = JSON.parse(decoded);
        manualDecode = {
          valid: !!(session.access_token && session.refresh_token && session.expires_at),
          hasAccessToken: !!session.access_token,
          tokenPreview: session.access_token?.substring(0, 20),
          expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        };
      } catch {
        manualDecode = { valid: false, error: 'JSON parse failed' };
      }
    } else {
      manualDecode = { valid: false, error: 'base64 decode failed' };
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

  const ssrGetUser = await ssrSupabase.auth.getUser()
    .then(r => ({ user: r.data?.user?.id || null, error: r.error?.message || null }))
    .catch(e => ({ user: null, error: e.message }));

  const ssrGetSession = await ssrSupabase.auth.getSession()
    .then(r => ({ found: !!r.data?.session, error: r.error?.message || null }))
    .catch(e => ({ found: false, error: e.message }));

  // ============================================
  // TEST 3: NEW approach — @supabase/supabase-js + setSession
  // ============================================
  let customGetUser: any = null;
  let customGetSession: any = null;
  let setSessionResult: any = null;

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
        refresh_token: session.refresh_token,
      });
      setSessionResult = {
        success: !!ssData?.session,
        error: ssError?.message || null,
        sessionUser: ssData?.session?.user?.id || null,
      };
    } else {
      setSessionResult = { success: false, error: 'No session to set', sessionUser: null };
    }

    customGetUser = await customSupabase.auth.getUser()
      .then(r => ({ user: r.data?.user?.id || null, error: r.error?.message || null }))
      .catch(e => ({ user: null, error: e.message }));

    customGetSession = await customSupabase.auth.getSession()
      .then(r => ({ found: !!r.data?.session, error: r.error?.message || null }))
      .catch(e => ({ found: false, error: e.message }));
  } catch (e: any) {
    customGetUser = { user: null, error: e.message };
    customGetSession = { found: false, error: e.message };
    if (!setSessionResult) setSessionResult = { success: false, error: e.message };
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
