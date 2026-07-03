'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { LanguageSwitcher } from './language-switcher'
import { NotificationBell } from './notification-bell'
import { AcademicYearSwitcher } from './academic-year-switcher'
import { Toaster } from '@/components/ui/sonner'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { getRoles } from '@/lib/security/roles'

interface TopBarProps {
  title?: string
  role?: string | string[]
}

export function TopBar({ title, role }: TopBarProps) {
  const roles = getRoles({ role })
  const isStudentOnly = roles.includes('student') && !roles.some((r) => ['superadmin', 'admin', 'teacher'].includes(r))

  return (
    <header data-slot="topbar" className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      {title && (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm font-medium">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="ml-auto flex items-center gap-1">
        {!isStudentOnly && <AcademicYearSwitcher />}
        <NotificationBell />
        <LanguageSwitcher />
      </div>
      <Toaster />
    </header>
  )
}
