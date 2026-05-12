'use client'

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ChevronDown, LogOut, User, Settings, Lock } from 'lucide-react'
import Link from 'next/link'
import { displayRole } from '@/lib/security/roles'

interface UserMenuProps {
  firstName?: string
  lastName?: string
  role?: string | string[]
  email?: string
  avatarUrl?: string
}

export function UserMenu({ firstName, lastName, role, email, avatarUrl }: UserMenuProps) {
  // Use name initials; fall back to email first char
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || email?.split('@')[0] || ''
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || email?.charAt(0).toUpperCase() || 'U'

  // Handle both string and string[] role
  const roles = Array.isArray(role) ? role : role ? [role] : []
  const isSuperAdmin = roles.includes('superadmin')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-11 max-w-[240px] gap-2 rounded-full px-2 py-1"
          />
        }
      >
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 text-left sm:block">
            <p className="truncate text-sm font-medium leading-4">{displayName}</p>
            {role && <p className="truncate text-xs leading-4 text-muted-foreground">{displayRole(role)}</p>}
          </div>
          <ChevronDown className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {email && (
          <>
            <DropdownMenuLabel>
              <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem render={<Link href="/settings/profile" />}>
          <User className="mr-2 size-4" />โปรไฟล์
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/change-password" />}>
          <Lock className="mr-2 size-4" />เปลี่ยนรหัสผ่าน
        </DropdownMenuItem>
        {isSuperAdmin && (
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings className="mr-2 size-4" />ตั้งค่าระบบ
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<a href="/api/auth/logout" />}>
          <LogOut className="mr-2 size-4" />ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
