'use client';

import Link from 'next/link';
import { Edit, Eye, MoreHorizontal, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export function ClassroomTable({ data, loading, onEdit, onDelete }: ClassroomTableProps) {
  const classroomT = useTranslations('classroom');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div></div>;
  if (!data || data.length === 0) return (
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
            <TableHead>{classroomT('roomName')}</TableHead>
            <TableHead>{classroomT('stage')}</TableHead>
            <TableHead>{classroomT('gradeLevel')}</TableHead>
            <TableHead>{classroomT('studentsCount')}</TableHead>
            <TableHead>{classroomT('homeroomTeacher')}</TableHead>
            <TableHead>{classroomT('advisorTeacher')}</TableHead>
            <TableHead className="w-[80px]">{studentT('actions')}</TableHead>
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
                <Badge variant="outline">{c.education_stage_name || classroomT('notSpecified')}</Badge>
              </TableCell>
              <TableCell>{c.grade_level_name || c.grade_level}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  {c.student_count}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{c.homeroom_teacher_name || commonT('notAvailable')}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{c.advisor_teacher_name || commonT('notAvailable')}</span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link href={`/classrooms/${c.id}`} />}>
                      <Eye className="mr-2 h-4 w-4" />{classroomT('viewDetail')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit?.(c)}><Edit className="mr-2 h-4 w-4" />{commonT('edit')}</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(c)}><Trash2 className="mr-2 h-4 w-4" />{commonT('delete')}</DropdownMenuItem>
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
