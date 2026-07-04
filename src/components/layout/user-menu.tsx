'use client'

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ChevronDown, LogOut, User, Settings, Lock, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface UserMenuProps {
  firstName?: string
  lastName?: string
  role?: string | string[]
  email?: string
  avatarUrl?: string
  placement?: 'topbar' | 'sidebar'
  dropdownSide?: 'top' | 'right' | 'bottom' | 'left'
  dropdownAlign?: 'start' | 'center' | 'end'
}

export function UserMenu({
  firstName,
  lastName,
  role,
  email,
  avatarUrl,
  placement = 'topbar',
  dropdownSide,
  dropdownAlign,
}: UserMenuProps) {
  const authT = useTranslations('auth')
  const navT = useTranslations('nav')
  const settingsT = useTranslations('settings')
  const teacherT = useTranslations('teacher')
  // Use name initials; fall back to email first char
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || email?.split('@')[0] || ''
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || email?.charAt(0).toUpperCase() || 'U'

  // Handle both string and string[] role
  const roles = Array.isArray(role) ? role : role ? [role] : []
  const isSuperAdmin = roles.includes('superadmin')
  const isStudentOnly = roles.includes('student') && !roles.some((r) => ['superadmin', 'admin', 'teacher'].includes(r))
  const isSidebar = placement === 'sidebar'
  const roleLabelByCode: Record<string, string> = {
    superadmin: teacherT('superadminRole'),
    admin: teacherT('adminRole'),
    teacher: teacherT('teacherRole'),
    student: teacherT('studentRole'),
  }
  const roleLabel = roles.map((roleCode) => roleLabelByCode[roleCode]).filter(Boolean).join(', ')
  const menuSide = dropdownSide ?? (isSidebar ? 'right' : 'bottom')
  const menuAlign = dropdownAlign ?? (isSidebar ? 'start' : 'end')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={cn(
              'gap-2 px-2 py-1',
              isSidebar
                ? 'h-auto min-h-16 w-full justify-start rounded-lg p-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:min-h-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:p-0'
                : 'h-11 max-w-[240px] rounded-full',
            )}
          />
        }
      >
        {isSidebar ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/60 text-sidebar-foreground group-data-[collapsible=icon]:size-8">
              <User className="size-4" />
            </div>
            <div className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold leading-5">{displayName}</p>
              {roleLabel && (
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <ShieldCheck className="size-3 shrink-0 text-sidebar-foreground/60" />
                  <span className="truncate text-xs leading-4 text-sidebar-foreground/65">{roleLabel}</span>
                </div>
              )}
            </div>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              <ChevronDown className="size-3.5 text-sidebar-foreground/70" />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="size-8">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 text-left sm:block">
              <p className="truncate text-sm font-medium leading-4">{displayName}</p>
              {roleLabel && <p className="truncate text-xs leading-4 text-muted-foreground">{roleLabel}</p>}
            </div>
            <ChevronDown className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={menuAlign} side={menuSide} sideOffset={8} className="w-56 max-w-[calc(100vw-2rem)]">
        {email && (
          <>
            <DropdownMenuLabel>
              <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {!isStudentOnly && (
          <>
            <DropdownMenuItem render={<Link href="/settings/profile" />}>
              <User className="mr-2 size-4" />{settingsT('profile')}
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/change-password" />}>
              <Lock className="mr-2 size-4" />{authT('changePassword')}
            </DropdownMenuItem>
          </>
        )}
        {isSuperAdmin && (
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings className="mr-2 size-4" />{navT('settings')}
          </DropdownMenuItem>
        )}
        {!isStudentOnly && <DropdownMenuSeparator />}
        <DropdownMenuItem render={<a href="/api/auth/logout" />}>
          <LogOut className="mr-2 size-4" />{authT('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
