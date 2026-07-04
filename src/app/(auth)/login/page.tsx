import { createAdminClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';
import { isVercelBlobReady } from '@/lib/storage/vercel-blob';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

function usableSchoolLogo(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  if (value.startsWith('/api/blob/') && !isVercelBlobReady()) return undefined;
  return value;
}

async function getLoginBranding() {
  const authT = await getTranslations('auth');
  try {
    const adminClient = await createAdminClient();
    const { data } = await adminClient
      .from('settings')
      .select('key, value')
      .in('key', ['school_name', 'school_logo']);

    const schoolName = data?.find((item) => item.key === 'school_name')?.value;
    const schoolLogo = data?.find((item) => item.key === 'school_logo')?.value;

    return {
      schoolName: typeof schoolName === 'string' && schoolName.trim() ? schoolName : authT('schoolFallbackName'),
      schoolLogo: usableSchoolLogo(schoolLogo),
    };
  } catch {
    return { schoolName: authT('schoolFallbackName'), schoolLogo: undefined };
  }
}

export default async function LoginPage() {
  const branding = await getLoginBranding();
  return <LoginForm {...branding} />;
}
