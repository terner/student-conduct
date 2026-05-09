'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ClipboardPlus, FileText, Settings, School, AlertTriangle,
  LogOut, Tags, CheckCircle2, FileSignature, Phone,
  CalendarDays,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'

const navigation = [
  { label: 'แดชบอร์ด', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'นักเรียน', icon: Users, href: '/students' },
  { label: 'ห้องเรียน', icon: GraduationCap, href: '/classrooms' },
  { label: 'บันทึกคะแนน', icon: ClipboardPlus, href: '/score/record' },
  { label: 'หมวดหมู่คะแนน', icon: Tags, href: '/score/categories' },
  { label: 'รออนุมัติ', icon: CheckCircle2, href: '/score/approval' },
  { label: 'รายงาน', icon: FileText, href: '/reports' },
  { label: 'ครู', icon: BookOpen, href: '/teachers' },
  { label: 'บันทึกติดต่อ', icon: Phone, href: '/interventions' },
  { label: 'ทัณฑ์บน', icon: FileSignature, href: '/reports/bond' },
  { label: 'ตั้งค่า', icon: Settings, href: '/settings' },
] as const

const alertItems = [
  { label: 'นักเรียนถึงเกณฑ์', icon: AlertTriangle, href: '/reports/threshold' },
] as const

interface AppSidebarProps {
  schoolName?: string
  schoolLogo?: string
}

export function AppSidebar({ schoolName = 'โรงเรียน', schoolLogo }: AppSidebarProps) {
  const pathname = usePathname()

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
                <span className="text-xs text-sidebar-foreground/60">ระบบความประพฤติ</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
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
          <SidebarGroupLabel>การแจ้งเตือน</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {alertItems.map((item) => {
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
            <SidebarMenuButton tooltip="ออกจากระบบ" render={<Link href="/api/auth/logout" prefetch={false} />}>
              <LogOut className="size-4" />
              <span>ออกจากระบบ</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
