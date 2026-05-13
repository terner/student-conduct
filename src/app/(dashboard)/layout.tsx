import { createAdminClient, getUserFromCookie } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopBar } from '@/components/layout/top-bar'
import { RouteAccessGuard } from '@/components/layout/route-access-guard'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let schoolName = 'โรงเรียน'
  let schoolLogo: string | undefined = undefined
  let firstName: string | undefined
  let lastName: string | undefined
  let role: string | string[] | undefined
  let email: string | undefined
  let avatarUrl: string | undefined

  try {
    const user = await getUserFromCookie()
    const adminClient = await createAdminClient()

    const [settingsResult, profileResult] = await Promise.all([
      adminClient
        .from('settings')
        .select('key, value')
        .in('key', ['school_name', 'school_logo']),
      user?.id
        ? adminClient
            .from('profiles')
            .select('role, full_name, avatar_url')
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    if (settingsResult.data) {
      schoolName = settingsResult.data.find(s => s.key === 'school_name')?.value || 'โรงเรียน'
      schoolLogo = settingsResult.data.find(s => s.key === 'school_logo')?.value || undefined
    }

    if (profileResult?.data) {
      role = profileResult.data.role
      avatarUrl = profileResult.data.avatar_url || undefined
      // full_name format: "prefixFirstName LastName" or "FirstName LastName"
      const parts = (profileResult.data.full_name || '').split(' ')
      if (parts.length >= 2) {
        firstName = parts[0]
        lastName = parts.slice(1).join(' ')
      } else {
        firstName = profileResult.data.full_name
      }
    }

    // Fallback: use email prefix if no full_name set
    if (!firstName && user?.email) {
      email = user.email
      firstName = user.email.split('@')[0]
    }
  } catch { /* use defaults */ }

  return (
    <SidebarProvider>
      <AppSidebar schoolName={schoolName} schoolLogo={schoolLogo} role={role} />
      <SidebarInset className="flex flex-1 flex-col overflow-hidden h-dvh">
        <TopBar firstName={firstName} lastName={lastName} role={role} email={email} avatarUrl={avatarUrl} />
        <main className="flex-1 overflow-y-auto">
          <RouteAccessGuard role={role}>{children}</RouteAccessGuard>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
