'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowDownUp, ArrowUp, Edit, MoreHorizontal, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  hidePagination?: boolean;
  onView: (student: StudentWithProfile) => void;
  onEdit?: (student: StudentWithProfile) => void;
  onDelete?: (student: StudentWithProfile) => void;
}

type SortField = 'student_id_number' | 'full_name' | 'classroom_name' | 'class_number' | 'education_stage_name' | 'current_score' | 'current_status';
type SortDirection = 'asc' | 'desc';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  transferred: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  graduated: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};
const emptyStudents: StudentWithProfile[] = [];

function studentFullName(student: StudentWithProfile) {
  return `${student.prefix}${student.first_name} ${student.last_name}`.trim();
}

function compareText(a: string | undefined, b: string | undefined) {
  return (a || '').localeCompare(b || '', 'th', { numeric: true, sensitivity: 'base' });
}

function compareNullableNumber(a: number | null | undefined, b: number | null | undefined, direction: SortDirection) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function compareStudents(a: StudentWithProfile, b: StudentWithProfile, field: SortField, direction: SortDirection) {
  if (field === 'class_number') return compareNullableNumber(a.class_number, b.class_number, direction);
  if (field === 'current_score') return compareNullableNumber(a.current_score, b.current_score, direction);

  let result = 0;
  if (field === 'student_id_number') result = compareText(a.student_id_number, b.student_id_number);
  else if (field === 'full_name') result = compareText(studentFullName(a), studentFullName(b));
  else if (field === 'classroom_name') result = compareText(a.classroom_name, b.classroom_name);
  else if (field === 'education_stage_name') result = compareText(a.education_stage_name, b.education_stage_name);
  else result = compareText(a.current_status, b.current_status);

  return direction === 'asc' ? result : -result;
}

function SortableTableHead({
  children,
  field,
  activeField,
  direction,
  onSort,
  className,
}: {
  children: ReactNode;
  field: SortField;
  activeField: SortField | null;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = activeField === field;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowDownUp;
  return (
    <TableHead className={className} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2 text-xs font-semibold"
        onClick={() => onSort(field)}
      >
        <span>{children}</span>
        <Icon className={`ml-1 h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`} />
      </Button>
    </TableHead>
  );
}

export function StudentTable({ data, loading, total, page = 1, pageSize = 20, onPageChange, hidePagination, onView, onEdit, onDelete }: StudentTableProps) {
  const t = useTranslations('student');
  const common = useTranslations('common');
  const [sortField, setSortField] = useState<SortField>('student_id_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const tableData = data || emptyStudents;
  const statusLabels: Record<string, string> = {
    active: t('statusActive'),
    inactive: t('statusInactive'),
    transferred: t('statusTransferred'),
    graduated: t('statusGraduated'),
    suspended: t('statusSuspended'),
  };

  const sortedData = useMemo(() => {
    if (!sortField) return tableData;
    return tableData
      .map((student, index) => ({ student, index }))
      .sort((a, b) => {
        const result = compareStudents(a.student, b.student, sortField, sortDirection);
        return result || compareText(a.student.student_id_number, b.student.student_id_number) || a.index - b.index;
      })
      .map(({ student }) => student);
  }, [sortDirection, sortField, tableData]);

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

  if (tableData.length === 0) {
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
  const paginationControls = showPagination ? (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
        {common('previous')}
      </Button>
      <span className="min-w-14 px-2 text-center text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {common('next')}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        {paginationControls && (
          <div className="flex min-h-12 items-center justify-end border-b px-3 py-2">
            {paginationControls}
          </div>
        )}
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
                <TableCell className="font-mono text-xs">
                  <button type="button" className="hover:text-primary hover:underline" onClick={(e) => { e.stopPropagation(); handleView(student); }}>
                    {student.student_id_number}
                  </button>
                </TableCell>
                <TableCell>
                  <button type="button" className="font-medium hover:text-primary hover:underline" onClick={(e) => { e.stopPropagation(); handleView(student); }}>
                    {studentFullName(student)}
                  </button>
                </TableCell>
                <TableCell>{student.classroom_name}</TableCell>
                <TableCell>{student.class_number ?? '-'}</TableCell>
                <TableCell>{student.education_stage_name || '-'}</TableCell>
                <TableCell className="font-medium">{student.current_score != null ? (student.current_score > 100 ? '100+' : student.current_score) : '-'}</TableCell>
                <TableCell>
                  <Badge className={statusColors[student.current_status] || ''} variant="outline">
                    {statusLabels[student.current_status] || student.current_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(student)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {common('edit')}
                      </DropdownMenuItem>
                      )}
                      {onDelete && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(student)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {common('delete')}
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
    </div>
  );
}
