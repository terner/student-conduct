'use client'

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings, Lock } from 'lucide-react'
import Link from 'next/link'
import { displayRole } from '@/lib/security/roles'

interface UserMenuProps {
  firstName?: string
  lastName?: string
  role?: string | string[]
  email?: string
}

export function UserMenu({ firstName, lastName, role, email }: UserMenuProps) {
  // Use name initials; fall back to email first char
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || email?.split('@')[0] || ''
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || email?.charAt(0).toUpperCase() || 'U'

  // Handle both string and string[] role
  const roles = Array.isArray(role) ? role : role ? [role] : []
  const isAdmin = roles.includes('admin')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="size-8 rounded-full p-0" />}>
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{displayName}</span>
              {role && <span className="text-xs text-muted-foreground">{displayRole(role)}</span>}
              {email && <span className="text-xs text-muted-foreground">{email}</span>}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings/profile" />}>
          <User className="mr-2 size-4" />โปรไฟล์
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/change-password" />}>
          <Lock className="mr-2 size-4" />เปลี่ยนรหัสผ่าน
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings className="mr-2 size-4" />ตั้งค่าระบบ
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/api/auth/logout" prefetch={false} />}>
          <LogOut className="mr-2 size-4" />ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
