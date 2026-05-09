'use client'

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings, Lock } from 'lucide-react'
import Link from 'next/link'

interface UserMenuProps {
  firstName?: string
  lastName?: string
  role?: string
}

export function UserMenu({ firstName, lastName, role }: UserMenuProps) {
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="size-8 rounded-full p-0" />}>
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials || 'U'}</AvatarFallback>
          </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{firstName} {lastName}</span>
            <span className="text-xs text-muted-foreground capitalize">{role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <User className="mr-2 size-4" />โปรไฟล์
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/change-password" />}>
          <Lock className="mr-2 size-4" />เปลี่ยนรหัสผ่าน
        </DropdownMenuItem>
        {role === 'admin' && (
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
