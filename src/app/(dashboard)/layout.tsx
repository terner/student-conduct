import { createClient } from '@/lib/supabase/server'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let schoolName = 'โรงเรียน'
  let schoolLogo: string | undefined = undefined
  try {
    const supabase = await createClient()
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['school_name', 'school_logo'])
    if (settings) {
      schoolName = settings.find(s => s.key === 'school_name')?.value || 'โรงเรียน'
      schoolLogo = settings.find(s => s.key === 'school_logo')?.value || undefined
    }
  } catch { /* use defaults */ }

  return (
    <SidebarProvider>
      <AppSidebar schoolName={schoolName} schoolLogo={schoolLogo} />
      <SidebarInset className="flex flex-1 flex-col">
        <TopBar title="แดชบอร์ด" />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
