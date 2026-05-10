'use client';

import Link from 'next/link';
import { Edit, Eye, MoreHorizontal, Power, PowerOff, Building, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';

interface TeacherTableProps {
  data: TeacherWithProfile[];
  loading?: boolean;
  onEdit?: (t: TeacherWithProfile) => void;
  onSetActive?: (teacher: TeacherWithProfile, isActive: boolean) => void;
}

export function TeacherTable({ data, loading, onEdit, onSetActive }: TeacherTableProps) {
  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div></div>;
  if (!data || data.length === 0) return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>ไม่มีครู</EmptyTitle>
        <EmptyDescription>ยังไม่มีข้อมูลครูในระบบ</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>รหัสเจ้าหน้าที่</TableHead>
            <TableHead>ชื่อ-นามสกุล</TableHead>
            <TableHead>ตำแหน่ง</TableHead>
            <TableHead>เบอร์โทร</TableHead>
            <TableHead>อีเมล</TableHead>
            <TableHead>แผนก</TableHead>
            <TableHead>สิทธิ์</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>ห้องที่ปรึกษา</TableHead>
            <TableHead className="w-[80px]">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-xs">{t.employee_id}</TableCell>
              <TableCell className="font-medium">{t.full_name}</TableCell>
              <TableCell>{t.position || 'ครู'}</TableCell>
              <TableCell>{t.phone || '-'}</TableCell>
              <TableCell>{t.email || '-'}</TableCell>
              <TableCell>
                {t.department ? (
                  <Badge variant="outline"><Building className="mr-1 h-3 w-3" />{t.department}</Badge>
                ) : '-'}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">ครู</Badge>
                  {t.roles?.includes('superadmin') && (
                    <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3" />Superadmin</Badge>
                  )}
                  {t.roles?.includes('admin') && (
                    <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3" />Admin</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {t.is_active === false ? (
                  <Badge variant="outline">inactive</Badge>
                ) : (
                  <Badge>active</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {t.assigned_classrooms?.map(c => c.classroom_name).join(', ') || '-'}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/teachers/${t.id}`} />}><Eye className="mr-2 h-4 w-4" />ดูรายละเอียด</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(t)}><Edit className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                    {t.is_active === false ? (
                      <DropdownMenuItem onClick={() => onSetActive?.(t, true)}>
                        <Power className="mr-2 h-4 w-4" />เปิดใช้งาน
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-destructive" onClick={() => onSetActive?.(t, false)}>
                        <PowerOff className="mr-2 h-4 w-4" />ปิดใช้งาน
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
