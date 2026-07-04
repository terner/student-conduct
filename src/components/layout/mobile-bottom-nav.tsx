'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  CheckCircle2,
  ClipboardPlus,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getRoles } from '@/lib/security/roles'

type NavLabelKey =
  | 'dashboard'
  | 'students'
  | 'recordScore'
  | 'pendingApproval'
  | 'reports'
  | 'settings'
  | 'classroomReport'
  | 'myScore'

interface MobileNavItem {
  labelKey: NavLabelKey
  href: string
  icon: LucideIcon
  roles: string[]
}

const items: MobileNavItem[] = [
  { labelKey: 'dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['superadmin', 'admin'] },
  { labelKey: 'recordScore', href: '/score/record', icon: ClipboardPlus, roles: ['superadmin', 'admin', 'teacher'] },
  { labelKey: 'pendingApproval', href: '/score/approval', icon: CheckCircle2, roles: ['superadmin', 'admin'] },
  { labelKey: 'reports', href: '/reports', icon: FileText, roles: ['superadmin', 'admin'] },
  { labelKey: 'settings', href: '/settings', icon: Settings, roles: ['superadmin', 'admin'] },
  { labelKey: 'students', href: '/students', icon: Users, roles: ['superadmin'] },
  { labelKey: 'classroomReport', href: '/reports/classroom', icon: FileText, roles: ['teacher'] },
  { labelKey: 'myScore', href: '/student/dashboard', icon: ClipboardPlus, roles: ['student'] },
]

export function MobileBottomNav({ role }: { role?: string | string[] | null }) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const userRoles = getRoles({ role })
  const visibleItems = items
    .filter((item) => item.roles.some((itemRole) => userRoles.includes(itemRole)))
    .slice(0, 5)

  if (visibleItems.length === 0) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-center gap-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.68rem] font-medium leading-none text-muted-foreground transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive && 'bg-primary text-primary-foreground shadow-sm'
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="w-full truncate text-center">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
