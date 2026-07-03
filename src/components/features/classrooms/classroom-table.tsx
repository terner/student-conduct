'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Edit, Eye, MoreHorizontal, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead, type SortDirection } from '@/components/ui/sortable-table-head';
import { compareNullableNumber, compareNullableText, textOrEmpty } from '@/components/ui/table-helpers';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';
import { useTranslations } from 'next-intl';

interface ClassroomTableProps {
  data: ClassroomWithDetails[];
  loading?: boolean;
  onEdit?: (c: ClassroomWithDetails) => void;
  onDelete?: (c: ClassroomWithDetails) => void;
}

type SortField = 'name' | 'education_stage_name' | 'student_count' | 'homeroom_teacher_name' | 'advisor_teacher_name';

function compareClassrooms(a: ClassroomWithDetails, b: ClassroomWithDetails, field: SortField, direction: SortDirection) {
  if (field === 'student_count') {
    return compareNullableNumber(a.student_count, b.student_count, direction);
  }

  const multiplier = direction === 'asc' ? 1 : -1;
  return compareNullableText(a[field], b[field]) * multiplier;
}

export function ClassroomTable({ data, loading, onEdit, onDelete }: ClassroomTableProps) {
  const router = useRouter();
  const classroomT = useTranslations('classroom');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const sortedData = useMemo(
    () => data
      .map((classroom, index) => ({ classroom, index }))
      .sort((a, b) => {
        const result = compareClassrooms(a.classroom, b.classroom, sortField, sortDirection);
        return result || compareNullableText(a.classroom.name, b.classroom.name) || a.index - b.index;
      })
      .map(({ classroom }) => classroom),
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
        <EmptyTitle>{classroomT('noClassrooms')}</EmptyTitle>
        <EmptyDescription>{classroomT('noClassroomsDescription')}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead field="name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{classroomT('roomName')}</SortableTableHead>
            <SortableTableHead field="education_stage_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{classroomT('stage')}</SortableTableHead>
            <SortableTableHead field="student_count" activeField={sortField} direction={sortDirection} onSort={handleSort}>{classroomT('studentsCount')}</SortableTableHead>
            <SortableTableHead field="homeroom_teacher_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{classroomT('homeroomTeacher')}</SortableTableHead>
            <SortableTableHead field="advisor_teacher_name" activeField={sortField} direction={sortDirection} onSort={handleSort}>{classroomT('advisorTeacher')}</SortableTableHead>
            <TableHead className="w-[80px]">{studentT('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((c) => (
            <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/classrooms/${c.id}`)}>
              <TableCell>
                <Link href={`/classrooms/${c.id}`} className="font-medium hover:text-primary hover:underline">
                  {c.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{textOrEmpty(c.education_stage_name)}</Badge>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {c.student_count}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{textOrEmpty(c.homeroom_teacher_name)}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{textOrEmpty(c.advisor_teacher_name)}</span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()} />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/classrooms/${c.id}`} onClick={(e) => e.stopPropagation()} />}>
                      <Eye className="mr-2 h-4 w-4" />{classroomT('viewDetail')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(c); }}><Edit className="mr-2 h-4 w-4" />{commonT('edit')}</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete?.(c); }}><Trash2 className="mr-2 h-4 w-4" />{commonT('delete')}</DropdownMenuItem>
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
