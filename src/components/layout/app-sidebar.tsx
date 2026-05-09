'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardPlus, FileText, Settings, School, AlertTriangle,
  LogOut, Tags, CheckCircle2, FileSignature, Phone,
  CalendarDays, History,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import { getRoles } from '@/lib/security/roles'

interface NavItem {
  label: string
  icon: any
  href: string
  group: 'main' | 'alert'
  /** Which roles can see this item. Omit = everyone (admin+teacher). */
  roles?: ('admin' | 'teacher')[]
}

interface AppSidebarProps {
  schoolName?: string
  schoolLogo?: string
  role?: string | string[] | null
}

export function AppSidebar({ schoolName = 'โรงเรียน', schoolLogo, role }: AppSidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const userRoles = getRoles(role ? { role } : { role: undefined })

  /** Check if the current user has access based on item role requirements */
  function hasAccess(itemRoles?: ('admin' | 'teacher')[]): boolean {
    if (!itemRoles || itemRoles.length === 0) return true // no restriction = admin+teacher
    return itemRoles.some(r => userRoles.includes(r))
  }

  const allNavigation: (NavItem & { group: 'main' | 'alert' })[] = [
    // Main menu — visible to both admin + teacher unless roles specified
    { label: t('dashboard'), icon: LayoutDashboard, href: '/dashboard', roles: ['admin'], group: 'main' },
    { label: t('students'), icon: Users, href: '/students', roles: ['admin'], group: 'main' },
    { label: t('classrooms'), icon: GraduationCap, href: '/classrooms', roles: ['admin'], group: 'main' },
    { label: t('recordScore'), icon: ClipboardPlus, href: '/score/record', group: 'main' },
    { label: t('scoreHistory'), icon: History, href: '/score/history', group: 'main' },
    { label: t('scoreCategories'), icon: Tags, href: '/score/categories', roles: ['admin'], group: 'main' },
    { label: t('pendingApproval'), icon: CheckCircle2, href: '/score/approval', roles: ['admin'], group: 'main' },
    { label: t('reports'), icon: FileText, href: '/reports', group: 'main' },
    { label: t('teachers'), icon: BookOpen, href: '/teachers', roles: ['admin'], group: 'main' },
    { label: t('contactLog'), icon: Phone, href: '/interventions', group: 'main' },
    { label: t('bond'), icon: FileSignature, href: '/reports/bond', roles: ['admin'], group: 'main' },
    { label: t('settings'), icon: Settings, href: '/settings', roles: ['admin'], group: 'main' },
    // Alert group
    { label: t('threshold'), icon: AlertTriangle, href: '/reports/threshold', group: 'alert' },
  ]

  const mainNavItems = allNavigation.filter(i => i.group === 'main' && hasAccess(i.roles))
  const alertNavItems = allNavigation.filter(i => i.group === 'alert' && hasAccess(i.roles))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {schoolLogo ? (
                  <img src={schoolLogo} alt="" className="size-6 rounded" />
                ) : (
                  <School className="size-4" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold truncate max-w-[140px]">{schoolName}</span>
                <span className="text-xs text-sidebar-foreground/60">{t('subtitle')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('mainMenu')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive} tooltip={item.label}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('alerts')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {alertNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={isActive} tooltip={item.label}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={t('logout')} render={<Link href="/api/auth/logout" prefetch={false} />}>
              <LogOut className="size-4" />
              <span>{t('logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
