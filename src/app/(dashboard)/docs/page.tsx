import { getUserFromCookie, createAdminClient } from '@/lib/supabase/server';
import { getRoles } from '@/lib/security/roles';
import { redirect } from 'next/navigation';
import { DocsContent } from './docs-content';

export const dynamic = 'force-dynamic';

export default async function DocsPage() {
  const user = await getUserFromCookie();
  if (!user) redirect('/login');

  const adminClient = await createAdminClient();
  const { data: profile } = await adminClient.from('profiles').select('role').eq('user_id', user.id).single();
  const roles = getRoles(profile ?? {});
  const canView = roles.includes('superadmin') || roles.includes('admin');
  if (!canView) redirect('/dashboard');

  return <DocsContent />;
}
