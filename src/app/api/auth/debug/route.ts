import { createServerClient, combineChunks } from '@supabase/ssr';
import { NextResponse } from 'next/server';

function decodeBase64URL(str: string): string | null {
  if (!str.startsWith('base64-')) return str;
  try {
    const b64 = str.slice(7);
    const binStr = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    const decoded = new TextDecoder().decode(bytes);
    JSON.parse(decoded); // validate JSON
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

  // Manual decode
  let manualDecode: any = null;
  if (authCookie) {
    const decoded = decodeBase64URL(authCookie.value);
    if (decoded) {
      try {
        const session = JSON.parse(decoded);
        manualDecode = {
          valid: !!(session.access_token && session.refresh_token && session.expires_at),
          hasAccessToken: !!session.access_token,
          tokenPreview: session.access_token?.substring(0, 20),
        };
      } catch {
        manualDecode = { valid: false, error: 'JSON parse failed' };
      }
    } else {
      manualDecode = { valid: false, error: 'base64 decode failed' };
    }
  }

  // Try library's combineChunks
  let combinedValue: string | null = null;
  try {
    combinedValue = await combineChunks('supabase.auth.token', async (chunkName) => {
      const c = manualCookies.find(({ name }) => name === chunkName);
      return c?.value || null;
    });
  } catch {}

  // Try client with manual cookies
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return manualCookies;
        },
        setAll() {},
      },
    }
  );

  const [getUserResult, getSessionResult] = await Promise.all([
    supabase.auth.getUser().then(r => ({ user: r.data?.user?.id || null, error: r.error?.message || null })).catch(e => ({ user: null, error: e.message })),
    supabase.auth.getSession().then(r => ({ found: !!r.data?.session, error: r.error?.message || null })).catch(e => ({ found: false, error: e.message })),
  ]);

  return NextResponse.json({
    cookiePresent: !!authCookie,
    cookieValuePrefix: authCookie?.value?.substring(0, 40),
    cookieValueLength: authCookie?.value?.length,
    manualDecode,
    combinedValuePrefix: combinedValue?.substring(0, 40),
    combinedValueLength: combinedValue?.length,
    getUser: getUserResult,
    getSession: getSessionResult,
  });
}
