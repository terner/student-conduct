'use client';

import Link from 'next/link';
import { Edit, Eye, MoreHorizontal, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';

interface StudentTableProps {
  data: StudentWithProfile[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onEdit?: (student: StudentWithProfile) => void;
  onDelete?: (student: StudentWithProfile) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  graduated: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  active: 'กำลังศึกษา',
  inactive: 'ไม่ active',
  transferred: 'ย้ายออก',
  graduated: 'จบการศึกษา',
  suspended: 'พักการเรียน',
};

export function StudentTable({ data, loading, total, page = 1, pageSize = 20, onPageChange, onEdit, onDelete }: StudentTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>ไม่พบข้อมูลนักเรียน</EmptyTitle>
          <EmptyDescription>ยังไม่มีนักเรียนในระบบ หรือค้นหาไม่พบ</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const totalPages = total ? Math.ceil(total / pageSize) : 1;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">รหัสนักเรียน</TableHead>
              <TableHead>ชื่อ-นามสกุล</TableHead>
              <TableHead>ห้องเรียน</TableHead>
              <TableHead>ชั้นปี</TableHead>
              <TableHead>ระดับ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="w-[80px] text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-mono text-xs">
                  <Link href={`/students/${student.id}`} className="hover:text-primary hover:underline">
                    {student.student_id_number}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/students/${student.id}`} className="font-medium hover:text-primary hover:underline">
                    {student.first_name} {student.last_name}
                  </Link>
                </TableCell>
                <TableCell>{student.classroom_name}</TableCell>
                <TableCell>{student.grade_level}</TableCell>
                <TableCell>{student.education_stage === 'primary' ? 'ประถม' : 'มัธยม'}</TableCell>
                <TableCell>
                  <Badge className={statusColors[student.current_status] || ''} variant="outline">
                    {statusLabels[student.current_status] || student.current_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link href={`/students/${student.id}`} />}>
                        <Eye className="mr-2 h-4 w-4" />
                        ดูรายละเอียด
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit?.(student)}>
                        <Edit className="mr-2 h-4 w-4" />
                        แก้ไข
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete?.(student)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        ลบ
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            ก่อนหน้า
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            ถัดไป
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
