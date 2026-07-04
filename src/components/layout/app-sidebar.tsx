'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardPlus, FileText, Settings, School, AlertTriangle,
  Tags, CheckCircle2,
  History, Upload,
  type LucideIcon,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar'
import { getRoles } from '@/lib/security/roles'
import { getScoreRecordingAvailability } from '@/lib/actions/score.action'
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection'
import { UserMenu } from '@/components/layout/user-menu'

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  group: 'main'
  roles?: ('superadmin' | 'admin' | 'teacher' | 'student')[]
}

interface AppSidebarProps {
  schoolName?: string
  schoolLogo?: string
  role?: string | string[] | null
  firstName?: string
  lastName?: string
  email?: string
  avatarUrl?: string
}

export function AppSidebar({ schoolName, schoolLogo, role, firstName, lastName, email, avatarUrl }: AppSidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const { isMobile, setOpenMobile } = useSidebar()
  const userRoles = getRoles(role ? { role } : { role: undefined })
  const selectedAcademicYearId = useSelectedAcademicYearId()
  const [selectedYearOpen, setSelectedYearOpen] = useState(false)

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false)
  }

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
  function hasAccess(itemRoles?: ('superadmin' | 'admin' | 'teacher' | 'student')[]): boolean {
    if (!itemRoles || itemRoles.length === 0) return false
    return itemRoles.some(r => userRoles.includes(r))
  }

  const allNavigation: NavItem[] = [
    { label: t('dashboard'), icon: LayoutDashboard, href: '/dashboard', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('students'), icon: Users, href: '/students', roles: ['superadmin'], group: 'main' },
    { label: t('classrooms'), icon: GraduationCap, href: '/classrooms', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('recordScore'), icon: ClipboardPlus, href: '/score/record', roles: ['superadmin', 'admin', 'teacher'], group: 'main' },
    { label: t('scoreHistory'), icon: History, href: '/score/history', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('scoreCategories'), icon: Tags, href: '/score/categories', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('pendingApproval'), icon: CheckCircle2, href: '/score/approval', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('importData'), icon: Upload, href: '/settings/import', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('reports'), icon: FileText, href: '/reports', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('threshold'), icon: AlertTriangle, href: '/reports/threshold', roles: ['superadmin', 'admin'], group: 'main' },
    { label: t('classroomReport'), icon: FileText, href: '/reports/classroom', roles: ['teacher'], group: 'main' },
    { label: t('teachers'), icon: BookOpen, href: '/teachers', roles: ['superadmin'], group: 'main' },
    { label: t('settings'), icon: Settings, href: '/settings', roles: ['superadmin', 'admin'], group: 'main' },
    { label: 'คู่มือ', icon: BookOpen, href: '/docs', roles: ['superadmin', 'admin'], group: 'main' },
    // Student
    { label: t('myScore'), icon: ClipboardPlus, href: '/student/dashboard', roles: ['student'], group: 'main' },
  ]

  const mainNavItems = allNavigation.filter(i => i.group === 'main' && hasAccess(i.roles))
  const disabledWhenYearClosed = new Set(['/settings/import', '/score/record'])
  const yearClosedTooltip = t('currentYearOnly')

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" onClick={closeMobileSidebar} className="flex flex-col items-center gap-3 group-data-[collapsible=icon]:gap-0">
          <div className="flex aspect-square size-24 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-md group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:shadow-none">
            {schoolLogo ? (
              <Image src={schoolLogo} alt="" width={80} height={80} unoptimized className="size-20 rounded-lg object-contain group-data-[collapsible=icon]:size-6" />
            ) : (
              <School className="size-12 group-data-[collapsible=icon]:size-4" />
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5 leading-none text-center group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-base truncate max-w-[180px]">{schoolName || t('schoolFallback')}</span>
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
                const isDisabled = disabledWhenYearClosed.has(item.href) && !selectedYearOpen
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={isDisabled ? undefined : <Link href={item.href} onClick={closeMobileSidebar} />}
                      isActive={isActive}
                      disabled={isDisabled}
                      title={isDisabled ? yearClosedTooltip : item.label}
                      tooltip={isDisabled ? yearClosedTooltip : item.label}
                    >
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

      <SidebarFooter className="border-t border-sidebar-border/60 bg-sidebar p-3">
        <UserMenu
          firstName={firstName}
          lastName={lastName}
          role={role || undefined}
          email={email}
          avatarUrl={avatarUrl}
          placement="sidebar"
          dropdownSide={isMobile ? 'top' : 'right'}
          dropdownAlign="start"
        />
      </SidebarFooter>
    </Sidebar>
  )
}
