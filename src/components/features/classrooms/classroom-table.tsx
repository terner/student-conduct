'use client';

import Link from 'next/link';
import { Edit, Eye, MoreHorizontal, Trash2, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';

interface ClassroomTableProps {
  data: ClassroomWithDetails[];
  loading?: boolean;
  onEdit?: (c: ClassroomWithDetails) => void;
  onDelete?: (c: ClassroomWithDetails) => void;
}

export function ClassroomTable({ data, loading, onEdit, onDelete }: ClassroomTableProps) {
  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div></div>;
  if (!data || data.length === 0) return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>ไม่มีห้องเรียน</EmptyTitle>
        <EmptyDescription>ยังไม่มีข้อมูลห้องเรียนในระบบ</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ชื่อห้อง</TableHead>
            <TableHead>ระดับ</TableHead>
            <TableHead>ชั้นปี</TableHead>
            <TableHead>จำนวนนักเรียน</TableHead>
            <TableHead>ครูที่ปรึกษา</TableHead>
            <TableHead className="w-[80px]">จัดการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link href={`/classrooms/${c.id}`} className="font-medium hover:text-primary hover:underline">
                  {c.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{c.education_stage === 'primary' ? 'ประถม' : 'มัธยม'}</Badge>
              </TableCell>
              <TableCell>ป.{c.grade_level}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {c.student_count}
                </span>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3 text-muted-foreground" />
                  {c.teacher_count}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/classrooms/${c.id}`} />}>
                      <Eye className="mr-2 h-4 w-4" />ดูรายละเอียด
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(c)}><Edit className="mr-2 h-4 w-4" />แก้ไข</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(c)}><Trash2 className="mr-2 h-4 w-4" />ลบ</DropdownMenuItem>
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
