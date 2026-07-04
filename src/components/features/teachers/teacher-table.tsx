'use client';

import { useMemo, useState } from 'react';
import { Edit, MoreHorizontal, Power, PowerOff, Building, ShieldCheck, KeyRound } from 'lucide-react';
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
  statusUpdatingTeacherId?: string | null;
  onView?: (teacher: TeacherWithProfile) => void;
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

export function TeacherTable({
  data,
  loading,
  statusUpdatingTeacherId,
  onView,
  onEdit,
  onSetActive,
  onResetPassword,
}: TeacherTableProps) {
  const teacherT = useTranslations('teacher');
  const classroomT = useTranslations('classroom');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const settingsT = useTranslations('settings');
  const [sortField, setSortField] = useState<SortField>('employee_id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const roleLabels: Record<string, string> = {
    superadmin: teacherT('superadminRole'),
    admin: teacherT('adminRole'),
  };
  const statusLabels: Record<string, string> = {
    active: commonT('active'),
    inactive: commonT('inactive'),
  };
  const activeStatusClassName = 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900 dark:text-green-300';
  const inactiveStatusClassName = 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900 dark:text-red-300';
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
    <>
      <div className="space-y-3 lg:hidden">
        {sortedData.map((teacher) => {
          const homeroom = joinNonEmpty(teacher.assigned_classrooms?.filter((item) => item.assignment_role === 'homeroom').map((item) => item.classroom_name) ?? []);
          const assistant = joinNonEmpty(teacher.assigned_classrooms?.filter((item) => item.assignment_role === 'assistant').map((item) => item.classroom_name) ?? []);

          return (
            <div
              key={teacher.id}
              role="button"
              tabIndex={0}
              className="block w-full rounded-xl border bg-background p-4 text-left"
              onClick={() => onView?.(teacher)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onView?.(teacher);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate font-medium">{teacher.full_name}</p>
                      <Badge variant="outline" className={teacher.is_active === false ? inactiveStatusClassName : activeStatusClassName}>
                        {teacher.is_active === false ? statusLabels.inactive : statusLabels.active}
                      </Badge>
                      {teacher.roles?.includes('superadmin') ? (
                        <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3" />{roleLabels.superadmin}</Badge>
                      ) : null}
                      {teacher.roles?.includes('admin') ? (
                        <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3" />{roleLabels.admin}</Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {teacher.position && teacher.position !== teacherT('teacher') ? <span>{teacher.position}</span> : null}
                      {teacher.employee_id ? <span className="font-mono">{teacher.employee_id}</span> : null}
                    </div>
                  </div>
                </div>
                <TeacherRowActions
                  teacher={teacher}
                  disabled={statusUpdatingTeacherId === teacher.id}
                  onEdit={onEdit}
                  onSetActive={onSetActive}
                  onResetPassword={onResetPassword}
                  editLabel={commonT('edit')}
                  resetPasswordLabel={studentT('resetPasswordAction')}
                  activeLabel={statusLabels.active}
                  inactiveLabel={statusLabels.inactive}
                />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <TeacherInfoLine label={teacherT('phone')} value={textOrEmpty(formatPhoneDisplay(teacher.phone))} />
                {teacher.department ? (
                  <TeacherInfoLine label={teacherT('department')} value={teacher.department} icon={<Building className="h-3.5 w-3.5" />} />
                ) : null}
                <TeacherInfoLine label={classroomT('homeroomTeacher')} value={homeroom} />
                {assistant ? (
                  <TeacherInfoLine label={settingsT('assistantTeacher')} value={assistant} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-md border lg:block">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <SortableTableHead field="employee_id" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('employeeId')}</SortableTableHead>
              <SortableTableHead field="full_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('fullName')}</SortableTableHead>
              <SortableTableHead field="position" activeField={sortField} direction={sortDirection} onSort={handleSort}>{teacherT('position')}</SortableTableHead>
              <SortableTableHead field="is_active" activeField={sortField} direction={sortDirection} onSort={handleSort}>{studentT('status')}</SortableTableHead>
              <SortableTableHead field="phone" activeField={sortField} direction={sortDirection} onSort={handleSort} className="hidden xl:table-cell">{teacherT('phone')}</SortableTableHead>
              <SortableTableHead field="email" activeField={sortField} direction={sortDirection} onSort={handleSort} className="hidden xl:table-cell">{teacherT('email')}</SortableTableHead>
              <SortableTableHead field="homeroom" activeField={sortField} direction={sortDirection} onSort={handleSort}>{classroomT('homeroomTeacher')}</SortableTableHead>
              <SortableTableHead field="assistant" activeField={sortField} direction={sortDirection} onSort={handleSort} className="hidden 2xl:table-cell">{settingsT('assistantTeacher')}</SortableTableHead>
              <TableHead className="hidden 2xl:table-cell">{teacherT('department')}</TableHead>
              <TableHead className="w-[80px]">{studentT('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((teacher) => (
              <TableRow key={teacher.id} className="cursor-pointer" onClick={() => onView?.(teacher)}>
                <TableCell className="font-mono text-xs">{textOrEmpty(teacher.employee_id)}</TableCell>
                <TableCell>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="truncate font-medium">{teacher.full_name}</div>
                      {teacher.roles?.includes('superadmin') && (
                        <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3" />{roleLabels.superadmin}</Badge>
                      )}
                      {teacher.roles?.includes('admin') && (
                        <Badge variant="default"><ShieldCheck className="mr-1 h-3 w-3" />{roleLabels.admin}</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground xl:hidden">
                      <span>{textOrEmpty(formatPhoneDisplay(teacher.phone))}</span>
                      <span>{textOrEmpty(teacher.email)}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{textOrEmpty(teacher.position)}</TableCell>
                <TableCell>
                  {teacher.is_active === false ? (
                    <Badge variant="outline" className={inactiveStatusClassName}>{statusLabels.inactive}</Badge>
                  ) : (
                    <Badge variant="outline" className={activeStatusClassName}>{statusLabels.active}</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden xl:table-cell">{textOrEmpty(formatPhoneDisplay(teacher.phone))}</TableCell>
                <TableCell className="hidden xl:table-cell">{textOrEmpty(teacher.email)}</TableCell>
                <TableCell className="text-sm">
                  {joinNonEmpty(teacher.assigned_classrooms?.filter((item) => item.assignment_role === 'homeroom').map((item) => item.classroom_name) ?? [])}
                </TableCell>
                <TableCell className="hidden text-sm 2xl:table-cell">
                  {joinNonEmpty(teacher.assigned_classrooms?.filter((item) => item.assignment_role === 'assistant').map((item) => item.classroom_name) ?? [])}
                </TableCell>
                <TableCell className="hidden 2xl:table-cell">
                  {teacher.department ? (
                    <Badge variant="outline"><Building className="mr-1 h-3 w-3" />{teacher.department}</Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  <TeacherRowActions
                    teacher={teacher}
                    disabled={statusUpdatingTeacherId === teacher.id}
                    onEdit={onEdit}
                    onSetActive={onSetActive}
                    onResetPassword={onResetPassword}
                    editLabel={commonT('edit')}
                    resetPasswordLabel={studentT('resetPasswordAction')}
                    activeLabel={statusLabels.active}
                    inactiveLabel={statusLabels.inactive}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function TeacherInfoLine({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="min-w-0 break-words">{value}</p>
    </div>
  );
}

function TeacherRowActions({
  teacher,
  disabled,
  onEdit,
  onSetActive,
  onResetPassword,
  editLabel,
  resetPasswordLabel,
  activeLabel,
  inactiveLabel,
}: {
  teacher: TeacherWithProfile;
  disabled: boolean;
  onEdit?: (teacher: TeacherWithProfile) => void;
  onSetActive?: (teacher: TeacherWithProfile, isActive: boolean) => void;
  onResetPassword?: (teacher: TeacherWithProfile) => void;
  editLabel: string;
  resetPasswordLabel: string;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()} />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(teacher); }}>
          <Edit className="mr-2 h-4 w-4" />
          {editLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResetPassword?.(teacher); }}>
          <KeyRound className="mr-2 h-4 w-4" />
          {resetPasswordLabel}
        </DropdownMenuItem>
        {teacher.is_active === false ? (
          <DropdownMenuItem
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onSetActive?.(teacher, true); }}
          >
            <Power className="mr-2 h-4 w-4" />
            {activeLabel}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            className="text-destructive"
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); onSetActive?.(teacher, false); }}
          >
            <PowerOff className="mr-2 h-4 w-4" />
            {inactiveLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
