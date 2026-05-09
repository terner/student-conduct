import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    const supabase = await createClient();

    // Test getUser
    const getUserResult = await supabase.auth.getUser();
    results.getUser = {
      hasUser: !!getUserResult.data?.user,
      userId: getUserResult.data?.user?.id || null,
      email: getUserResult.data?.user?.email || null,
      error: getUserResult.error?.message || null,
    };

    // Test getSession
    const getSessionResult = await supabase.auth.getSession();
    results.getSession = {
      hasSession: !!getSessionResult.data?.session,
      hasAccessToken: !!getSessionResult.data?.session?.access_token,
      hasRefreshToken: !!getSessionResult.data?.session?.refresh_token,
      expiresAt: getSessionResult.data?.session?.expires_at || null,
      error: getSessionResult.error?.message || null,
    };

    // Test table access
    if (getUserResult.data?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, full_name, is_active')
        .eq('user_id', getUserResult.data.user.id)
        .single();

      results.profile = {
        found: !!profile,
        data: profile ? { id: profile.id, role: profile.role, full_name: profile.full_name, is_active: profile.is_active } : null,
        error: profileError?.message || null,
      };

      if (profile) {
        const { count: studentCount } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });
        results.studentCount = studentCount;

        const { count: classroomCount } = await supabase
          .from('classrooms')
          .select('*', { count: 'exact', head: true });
        results.classroomCount = classroomCount;
      }
    }
  } catch (err: any) {
    results.error = err.message;
    results.stack = err.stack?.split('\n').slice(0, 5).join('\n');
  }

  return NextResponse.json(results);
}
