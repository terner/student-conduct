'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead, type SortDirection } from '@/components/ui/sortable-table-head';
import { TablePaginationToolbar } from '@/components/ui/table-pagination-toolbar';
import { compareNullableNumber, compareNullableText, scoreText, statusLabel, textOrEmpty } from '@/components/ui/table-helpers';
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
  hidePagination?: boolean;
  onView: (student: StudentWithProfile) => void;
  onEdit?: (student: StudentWithProfile) => void;
  onDelete?: (student: StudentWithProfile) => void;
}

type SortField = 'student_id_number' | 'full_name' | 'classroom_name' | 'class_number' | 'education_stage_name' | 'current_score' | 'current_status';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  graduated: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

function studentFullName(student: StudentWithProfile) {
  return `${student.prefix}${student.first_name} ${student.last_name}`.trim();
}

function compareStudents(a: StudentWithProfile, b: StudentWithProfile, field: SortField, direction: SortDirection) {
  if (field === 'class_number') return compareNullableNumber(a.class_number, b.class_number, direction);
  if (field === 'current_score') return compareNullableNumber(a.current_score, b.current_score, direction);

  let result = 0;
  if (field === 'student_id_number') result = compareNullableText(a.student_id_number, b.student_id_number);
  else if (field === 'full_name') result = compareNullableText(studentFullName(a), studentFullName(b));
  else if (field === 'classroom_name') result = compareNullableText(a.classroom_name, b.classroom_name);
  else if (field === 'education_stage_name') result = compareNullableText(a.education_stage_name, b.education_stage_name);
  else result = compareNullableText(a.current_status, b.current_status);

  return direction === 'asc' ? result : -result;
}

export function StudentTable({ data, loading, total, page = 1, pageSize = 20, onPageChange, hidePagination, onView, onEdit, onDelete }: StudentTableProps) {
  const t = useTranslations('student');
  const common = useTranslations('common');
  const [sortField, setSortField] = useState<SortField>('student_id_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const statusLabels: Record<string, string> = {
    active: t('statusActive'),
    inactive: t('statusInactive'),
    transferred: t('statusTransferred'),
    graduated: t('statusGraduated'),
    suspended: t('statusSuspended'),
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return data
      .map((student, index) => ({ student, index }))
      .sort((a, b) => {
        const result = compareStudents(a.student, b.student, sortField, sortDirection);
        return result || compareNullableText(a.student.student_id_number, b.student.student_id_number) || a.index - b.index;
      })
      .map(({ student }) => student);
  }, [data, sortDirection, sortField]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  }

  function handleView(student: StudentWithProfile) {
    onView(student);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{common('loading')}</p></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t('noStudentsTitle')}</EmptyTitle>
          <EmptyDescription>{t('noStudentsDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const totalPages = total ? Math.ceil(total / pageSize) : 1;
  const showPagination = !hidePagination && totalPages > 1 && onPageChange;
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = total ? Math.min(page * pageSize, total) : 0;

  return (
    <div className="space-y-4">
      {showPagination && onPageChange ? (
        <TablePaginationToolbar
          page={page}
          pageSize={pageSize}
          total={total ?? data.length}
          summary={common('paginationSummary', { start: from, end: to, total: total ?? data.length })}
          onPageChange={onPageChange}
          rowsPerPageLabel={common('rowsPerPage')}
        />
      ) : null}

      <div className="space-y-3 lg:hidden">
        {sortedData.map((student) => {
          const classroomMeta = [
            textOrEmpty(student.classroom_name),
            student.class_number == null ? '' : `${t('classNumber')} ${student.class_number}`,
          ].filter(Boolean).join(' ');

          return (
            <div
              key={student.id}
              role="button"
              tabIndex={0}
              className="rounded-xl border bg-background p-4 text-left"
              onClick={() => handleView(student)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                handleView(student);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-medium">{studentFullName(student)}</p>
                    <Badge className={statusColors[student.current_status] ?? ''} variant="outline">
                      {statusLabel(student.current_status, statusLabels)}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <StudentMetaInline label={t('id')} value={student.student_id_number} valueClassName="font-mono" />
                    {classroomMeta ? <StudentMetaInline label={t('classroomFull')} value={classroomMeta} /> : null}
                  </div>
                </div>
                <div onClick={(event) => event.stopPropagation()}>
                  <StudentRowActions
                    student={student}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    editLabel={common('edit')}
                    deleteLabel={common('delete')}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <StudentInfoLine label={t('score')} value={scoreText(student.current_score, t('scoreCapped'))} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden rounded-md border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="student_id_number" activeField={sortField} direction={sortDirection} onSort={handleSort} className="w-[100px]">{t('id')}</SortableTableHead>
              <SortableTableHead field="full_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{t('fullName')}</SortableTableHead>
              <SortableTableHead field="classroom_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{t('classroomFull')}</SortableTableHead>
              <SortableTableHead field="class_number" activeField={sortField} direction={sortDirection} onSort={handleSort}>{t('classNumber')}</SortableTableHead>
              <SortableTableHead field="education_stage_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{t('stage')}</SortableTableHead>
              <SortableTableHead field="current_score" activeField={sortField} direction={sortDirection} onSort={handleSort}>{t('score')}</SortableTableHead>
              <SortableTableHead field="current_status" activeField={sortField} direction={sortDirection} onSort={handleSort}>{t('status')}</SortableTableHead>
              <TableHead className="w-[80px] text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((student) => (
              <TableRow
                key={student.id}
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => handleView(student)}
              >
                <TableCell className="font-mono text-xs">{student.student_id_number}</TableCell>
                <TableCell className="font-medium">{studentFullName(student)}</TableCell>
                <TableCell>{textOrEmpty(student.classroom_name)}</TableCell>
                <TableCell>{student.class_number == null ? '' : String(student.class_number)}</TableCell>
                <TableCell>{textOrEmpty(student.education_stage_name)}</TableCell>
                <TableCell className="font-medium">{scoreText(student.current_score, t('scoreCapped'))}</TableCell>
                <TableCell>
                  <Badge className={statusColors[student.current_status] ?? ''} variant="outline">
                    {statusLabel(student.current_status, statusLabels)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <StudentRowActions
                    student={student}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    editLabel={common('edit')}
                    deleteLabel={common('delete')}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StudentInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StudentMetaInline({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`min-w-0 truncate ${valueClassName ?? ''}`}>{value}</span>
    </div>
  );
}

function StudentRowActions({
  student,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
}: {
  student: StudentWithProfile;
  onEdit?: (student: StudentWithProfile) => void;
  onDelete?: (student: StudentWithProfile) => void;
  editLabel: string;
  deleteLabel: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit ? (
          <DropdownMenuItem onClick={() => onEdit(student)}>
            <Edit className="mr-2 h-4 w-4" />
            {editLabel}
          </DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(student)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteLabel}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
