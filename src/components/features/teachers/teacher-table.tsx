'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Edit, Eye, MoreHorizontal, Power, PowerOff, Building, ShieldCheck, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPhoneDisplay } from '@/lib/phone';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead, type SortDirection } from '@/components/ui/sortable-table-head';
import { compareNullableText, textOrEmpty, joinNonEmpty } from '@/components/ui/table-helpers';
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
  onResetPassword?: (teacher: TeacherWithProfile) => void;
}

type SortField =
  | 'employee_id'
  | 'full_name'
  | 'position'
  | 'phone'
  | 'email'
  | 'department'
  | 'is_active'
  | 'homeroom'
  | 'assistant';

function compareTeachers(a: TeacherWithProfile, b: TeacherWithProfile, field: SortField, direction: SortDirection) {
  const multiplier = direction === 'asc' ? 1 : -1;

  if (field === 'is_active') {
    const result = Number(a.is_active !== false) - Number(b.is_active !== false);
    return result * multiplier;
  }

  if (field === 'homeroom') {
    return compareNullableText(
      joinNonEmpty(a.assigned_classrooms?.filter((item) => item.assignment_role === 'homeroom').map((item) => item.classroom_name) ?? []),
      joinNonEmpty(b.assigned_classrooms?.filter((item) => item.assignment_role === 'homeroom').map((item) => item.classroom_name) ?? []),
    ) * multiplier;
  }

  if (field === 'assistant') {
    return compareNullableText(
      joinNonEmpty(a.assigned_classrooms?.filter((item) => item.assignment_role === 'assistant').map((item) => item.classroom_name) ?? []),
      joinNonEmpty(b.assigned_classrooms?.filter((item) => item.assignment_role === 'assistant').map((item) => item.classroom_name) ?? []),
    ) * multiplier;
  }

  return compareNullableText(textValue(a, field), textValue(b, field)) * multiplier;
}

function textValue(teacher: TeacherWithProfile, field: Exclude<SortField, 'is_active' | 'homeroom' | 'assistant'>) {
  if (field === 'employee_id') return teacher.employee_id;
  if (field === 'full_name') return teacher.full_name;
  if (field === 'position') return teacher.position;
  if (field === 'phone') return formatPhoneDisplay(teacher.phone);
  if (field === 'email') return teacher.email;
  return teacher.department;
}

export function TeacherTable({ data, loading, onEdit, onSetActive, onResetPassword }: TeacherTableProps) {
  const router = useRouter();
  const teacherT = useTranslations('teacher');
  const classroomT = useTranslations('classroom');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const settingsT = useTranslations('settings');
  const [sortField, setSortField] = useState<SortField>('employee_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const roleLabels: Record<string, string> = {
    superadmin: commonT('superadminRole'),
    admin: commonT('adminRole'),
  };
  const statusLabels: Record<string, string> = {
    active: commonT('active'),
    inactive: commonT('inactive'),
  };
  const sortedData = useMemo(
    () => data
      .map((teacher, index) => ({ teacher, index }))
      .sort((a, b) => {
        const result = compareTeachers(a.teacher, b.teacher, sortField, sortDirection);
        return result || compareNullableText(a.teacher.employee_id, b.teacher.employee_id) || a.index - b.index;
      })
      .map(({ teacher }) => teacher),
    [data, sortDirection, sortField],
  );

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  }

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div></div>;
  if (data.length === 0) return (
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
            <SortableTableHead field="employee_id" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('employeeId')}</SortableTableHead>
            <SortableTableHead field="full_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('fullName')}</SortableTableHead>
            <SortableTableHead field="position" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('position')}</SortableTableHead>
            <SortableTableHead field="phone" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('phone')}</SortableTableHead>
            <SortableTableHead field="email" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('email')}</SortableTableHead>
            <SortableTableHead field="department" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('department')}</SortableTableHead>
            <TableHead>{teacherT('roles')}</TableHead>
            <SortableTableHead field="is_active" activeField={sortField} direction={sortDirection} onSort={handleSort}>{studentT('status')}</SortableTableHead>
            <SortableTableHead field="homeroom" activeField={sortField} direction={sortDirection} onSort={handleSort}>{classroomT('homeroomTeacher')}</SortableTableHead>
            <SortableTableHead field="assistant" activeField={sortField} direction={sortDirection} onSort={handleSort}>{settingsT('assistantTeacher')}</SortableTableHead>
            <TableHead className="w-[80px]">{studentT('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((t) => (
            <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/teachers/${t.id}`)}>
              <TableCell className="font-mono text-xs">{textOrEmpty(t.employee_id)}</TableCell>
              <TableCell>
                <span className="font-medium">{t.full_name}</span>
              </TableCell>
              <TableCell>{textOrEmpty(t.position)}</TableCell>
              <TableCell>{textOrEmpty(formatPhoneDisplay(t.phone))}</TableCell>
              <TableCell>{textOrEmpty(t.email)}</TableCell>
              <TableCell>
                {t.department ? (
                  <Badge variant="outline"><Building className="mr-1 h-3 w-3" />{t.department}</Badge>
                ) : null}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{commonT('teacherRole')}</Badge>
                  {t.roles?.includes('superadmin') && (
                    <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3" />{roleLabels.superadmin}</Badge>
                  )}
                  {t.roles?.includes('admin') && (
                    <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3" />{roleLabels.admin}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {t.is_active === false ? (
                  <Badge variant="outline">{statusLabels.inactive}</Badge>
                ) : (
                  <Badge>{statusLabels.active}</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {joinNonEmpty(t.assigned_classrooms?.filter((c) => c.assignment_role === 'homeroom').map((c) => c.classroom_name) ?? [])}
              </TableCell>
              <TableCell className="text-sm">
                {joinNonEmpty(t.assigned_classrooms?.filter((c) => c.assignment_role === 'assistant').map((c) => c.classroom_name) ?? [])}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()} />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/teachers/${t.id}`} onClick={(e) => e.stopPropagation()} />}><Eye className="mr-2 h-4 w-4" />{teacherT('viewDetail')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(t); }}><Edit className="mr-2 h-4 w-4" />{commonT('edit')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResetPassword?.(t); }}><KeyRound className="mr-2 h-4 w-4" />{studentT('resetPasswordAction')}</DropdownMenuItem>
                    {t.is_active === false ? (
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetActive?.(t, true); }}>
                        <Power className="mr-2 h-4 w-4" />{statusLabels.active}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onSetActive?.(t, false); }}>
                        <PowerOff className="mr-2 h-4 w-4" />{statusLabels.inactive}
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
