import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกอีเมลและรหัสผ่าน' },
        { status: 400 }
      );
    }

    // Use @supabase/supabase-js directly for authentication
    const supabase = createClient(
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Login API] signInWithPassword error:', error.message, error.status);
      const message = error.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      return NextResponse.json({ error: message, details: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'ไม่ได้รับข้อมูล session' },
        { status: 500 }
      );
    }

    // Build the response
    const response = NextResponse.json({ success: true });

    // Encode session as base64url cookie (matching our custom server.ts decoder)
    const maxAge = 400 * 24 * 60 * 60; // 400 days
    const sessionJson = JSON.stringify(data.session);
    const base64url = Buffer.from(sessionJson)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const cookieVal = `base64-${base64url}`;

    response.cookies.set('supabase.auth.token', cookieVal, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });

    return response;
  } catch (err) {
    console.error('[Login API Route] Error:', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
