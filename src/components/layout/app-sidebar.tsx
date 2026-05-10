'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardPlus, FileText, Settings, School, AlertTriangle,
  LogOut, Tags, CheckCircle2,
  CalendarDays, History, Upload,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import { getRoles } from '@/lib/security/roles'
import { getScoreRecordingAvailability } from '@/lib/actions/score.action'
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection'

interface NavItem {
  label: string
  icon: any
  href: string
  group: 'main' | 'alert'
  roles?: ('superadmin' | 'admin' | 'teacher')[]
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
  const selectedAcademicYearId = useSelectedAcademicYearId()
  const [selectedYearOpen, setSelectedYearOpen] = useState(false)

  useEffect(() => {
    if (!selectedAcademicYearId) {
      void Promise.resolve().then(() => setSelectedYearOpen(false))
      return
    }

    let cancelled = false
    Promise.resolve()
      .then(() => getScoreRecordingAvailability(selectedAcademicYearId))
      .then((result) => {
        if (!cancelled) setSelectedYearOpen(Boolean(result.success && result.data?.can_record))
      })
      .catch(() => {
        if (!cancelled) setSelectedYearOpen(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedAcademicYearId])

  /** Check if the current user has access based on item role requirements */
  function hasAccess(itemRoles?: ('superadmin' | 'admin' | 'teacher')[]): boolean {
    if (!itemRoles || itemRoles.length === 0) return false
    return itemRoles.some(r => userRoles.includes(r))
  }

  const allNavigation: (NavItem & { group: 'main' | 'alert' })[] = [
    { label: t('dashboard'), icon: LayoutDashboard, href: '/dashboard', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('students'), icon: Users, href: '/students', roles: ['superadmin'], group: 'main' },
    { label: t('classrooms'), icon: GraduationCap, href: '/classrooms', roles: ['superadmin'], group: 'main' },
    { label: t('recordScore'), icon: ClipboardPlus, href: '/score/record', roles: ['superadmin', 'admin', 'teacher'], group: 'main' },
    { label: t('scoreHistory'), icon: History, href: '/score/history', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('scoreCategories'), icon: Tags, href: '/score/categories', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('pendingApproval'), icon: CheckCircle2, href: '/score/approval', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('importData'), icon: Upload, href: '/settings/import', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('reports'), icon: FileText, href: '/reports', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('classroomReport'), icon: FileText, href: '/reports/classroom', roles: ['teacher'], group: 'main' },
    { label: t('teachers'), icon: BookOpen, href: '/teachers', roles: ['superadmin'], group: 'main' },
    { label: t('settings'), icon: Settings, href: '/settings', roles: ['superadmin', 'admin'], group: 'main' },
    // Alert group
    { label: t('threshold'), icon: AlertTriangle, href: '/reports/threshold', roles: ['superadmin', 'admin'], group: 'alert' },
  ]

  const visibleNavigation = allNavigation.filter((item) => item.href !== '/settings/import' || selectedYearOpen)
  const mainNavItems = visibleNavigation.filter(i => i.group === 'main' && hasAccess(i.roles))
  const alertNavItems = visibleNavigation.filter(i => i.group === 'alert' && hasAccess(i.roles))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex flex-col items-center gap-3 group-data-[collapsible=icon]:gap-0">
          <div className="flex aspect-square size-24 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-md group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:shadow-none">
            {schoolLogo ? (
              <img src={schoolLogo} alt="" className="size-20 rounded-lg object-contain group-data-[collapsible=icon]:size-6" />
            ) : (
              <School className="size-12 group-data-[collapsible=icon]:size-4" />
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5 leading-none text-center group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-base truncate max-w-[180px]">{schoolName}</span>
            <span className="text-xs text-sidebar-foreground/60">{t('subtitle')}</span>
          </div>
        </Link>
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
            <SidebarMenuButton tooltip={t('logout')} render={<a href="/api/auth/logout" />}>
              <LogOut className="size-4" />
              <span>{t('logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
