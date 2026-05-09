'use client';

import Link from 'next/link';
import { Edit, Eye, MoreHorizontal, Trash2, Building } from 'lucide-react';
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
  onDelete?: (t: TeacherWithProfile) => void;
}

export function TeacherTable({ data, loading, onEdit, onDelete }: TeacherTableProps) {
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
            <TableHead>แผนก</TableHead>
            <TableHead>ห้องที่ปรึกษา</TableHead>
            <TableHead className="w-[80px]">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-xs">{t.employee_id}</TableCell>
              <TableCell className="font-medium">{t.full_name}</TableCell>
              <TableCell>
                {t.department ? (
                  <Badge variant="outline"><Building className="mr-1 h-3 w-3" />{t.department}</Badge>
                ) : '-'}
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
                    {onDelete && <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(t)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>}
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
