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
import { useTranslations } from 'next-intl';

interface TeacherTableProps {
  data: TeacherWithProfile[];
  loading?: boolean;
  onEdit?: (t: TeacherWithProfile) => void;
  onSetActive?: (teacher: TeacherWithProfile, isActive: boolean) => void;
}

export function TeacherTable({ data, loading, onEdit, onSetActive }: TeacherTableProps) {
  const teacherT = useTranslations('teacher');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div></div>;
  if (!data || data.length === 0) return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{teacherT('noTeachers')}</EmptyTitle>
        <EmptyDescription>{teacherT('noTeachersDescription')}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{teacherT('employeeId')}</TableHead>
            <TableHead>{teacherT('fullName')}</TableHead>
            <TableHead>{teacherT('position')}</TableHead>
            <TableHead>{teacherT('phone')}</TableHead>
            <TableHead>{teacherT('email')}</TableHead>
            <TableHead>{teacherT('department')}</TableHead>
            <TableHead>{teacherT('roles')}</TableHead>
            <TableHead>{studentT('status')}</TableHead>
            <TableHead>{teacherT('advisorRooms')}</TableHead>
            <TableHead className="w-[80px]">{studentT('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-mono text-xs">{t.employee_id}</TableCell>
              <TableCell>
                <span className="font-medium">{t.full_name}</span>
              </TableCell>
              <TableCell>{t.position || teacherT('teacher')}</TableCell>
              <TableCell>{t.phone || commonT('notAvailable')}</TableCell>
              <TableCell>{t.email || commonT('notAvailable')}</TableCell>
              <TableCell>
                {t.department ? (
                  <Badge variant="outline"><Building className="mr-1 h-3 w-3" />{t.department}</Badge>
                ) : commonT('notAvailable')}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{teacherT('teacher')}</Badge>
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
                  <Badge variant="outline">{commonT('inactive')}</Badge>
                ) : (
                  <Badge>{commonT('active')}</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {t.assigned_classrooms?.map(c => c.classroom_name).join(', ') || commonT('notAvailable')}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/teachers/${t.id}`} />}><Eye className="mr-2 h-4 w-4" />{teacherT('viewDetail')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(t)}><Edit className="mr-2 h-4 w-4" />{commonT('edit')}</DropdownMenuItem>
                    {t.is_active === false ? (
                      <DropdownMenuItem onClick={() => onSetActive?.(t, true)}>
                        <Power className="mr-2 h-4 w-4" />{commonT('active')}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-destructive" onClick={() => onSetActive?.(t, false)}>
                        <PowerOff className="mr-2 h-4 w-4" />{commonT('inactive')}
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
