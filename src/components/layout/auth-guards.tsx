import { redirect } from 'next/navigation'
import { createAdminClient, getUserFromCookie } from '@/lib/supabase/server'
import { checkPDPAConsent } from '@/lib/actions/dashboard.action'

/**
 * Server-side guard for password change and PDPA consent
 * Use in (dashboard)/layout.tsx to redirect before rendering children
 */
export async function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = await getUserFromCookie()

  if (!user) {
    redirect('/login')
  }

  const adminClient = await createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, user_id, must_change_password')
    .eq('user_id', user.id)
    .maybeSingle()

  // 1. Check password change required FIRST
  if (profile?.must_change_password) {
    redirect('/first-password')
  }

  // 2. Check PDPA consent
  const pdpaResult = await checkPDPAConsent()
  if (pdpaResult.success && pdpaResult.data?.consented === false) {
    redirect('/pdpa-consent')
  }

  return <>{children}</>
}
