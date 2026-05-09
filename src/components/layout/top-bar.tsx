'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { LanguageSwitcher } from './language-switcher'
import { UserMenu } from './user-menu'
import { NotificationBell } from './notification-bell'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb'

interface TopBarProps {
  title?: string
  firstName?: string
  lastName?: string
  role?: string
  email?: string
}

export function TopBar({ title, firstName, lastName, role, email }: TopBarProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b border-border px-4">
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
        <NotificationBell />
        <LanguageSwitcher />
        <UserMenu firstName={firstName} lastName={lastName} role={role} email={email} />
      </div>
    </header>
  )
}
