import { createServerClient } from '@supabase/ssr';
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

    // Create supabase client that reads cookies from request
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get('cookie') || '';
            return cookieHeader.split('; ').filter(Boolean).map(c => {
              const [name, ...rest] = c.split('=');
              return { name: name?.trim() || '', value: rest.join('=') || '' };
            });
          },
          setAll() {
            // Cookies will be set manually in the response below
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const message = error.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'ไม่ได้รับข้อมูล session' },
        { status: 500 }
      );
    }

    // Build the response
    const response = NextResponse.json({ success: true });

    // Manually set the auth cookie with correct encoding
    // @supabase/ssr uses: base64-<base64url(sessionJSON)>
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
