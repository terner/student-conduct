import { createAdminClient } from '@/lib/supabase/server';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

async function getLoginBranding() {
  try {
    const adminClient = await createAdminClient();
    const { data } = await adminClient
      .from('settings')
      .select('key, value')
      .in('key', ['school_name', 'school_logo']);

    const schoolName = data?.find((item) => item.key === 'school_name')?.value;
    const schoolLogo = data?.find((item) => item.key === 'school_logo')?.value;

    return {
      schoolName: typeof schoolName === 'string' && schoolName.trim() ? schoolName : 'โรงเรียน',
      schoolLogo: typeof schoolLogo === 'string' && schoolLogo.trim() ? schoolLogo : undefined,
    };
  } catch {
    return { schoolName: 'โรงเรียน', schoolLogo: undefined };
  }
}

export default async function LoginPage() {
  const branding = await getLoginBranding();
  return <LoginForm {...branding} />;
}
