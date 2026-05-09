import { createClientWithUser } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let schoolName = 'โรงเรียน'
  let schoolLogo: string | undefined = undefined
  let firstName: string | undefined
  let lastName: string | undefined
  let role: string | string[] | undefined
  let email: string | undefined

  try {
    const { supabase, user } = await createClientWithUser()

    const [settingsResult, profileResult] = await Promise.all([
      supabase
        .from('settings')
        .select('key, value')
        .in('key', ['school_name', 'school_logo']),
      user?.id
        ? supabase
            .from('profiles')
            .select('role, full_name')
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
      <SidebarInset className="flex flex-1 flex-col">
        <TopBar title="แดชบอร์ด" firstName={firstName} lastName={lastName} role={role} email={email} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
