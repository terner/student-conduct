'use client';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';

interface TeacherAssignmentTableProps {
  classroomId: string;
  teachers: TeacherWithProfile[];
  onRemove?: (teacherId: string) => void;
}

export function TeacherAssignmentTable({ teachers, classroomId, onRemove }: TeacherAssignmentTableProps) {
  const assignedTeachers = teachers.filter(t =>
    t.assigned_classrooms?.some(c => c.classroom_id === classroomId)
  );

  if (assignedTeachers.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีครูประจำชั้น</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ชื่อ-นามสกุล</TableHead>
          <TableHead>บทบาท</TableHead>
          <TableHead className="w-[60px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignedTeachers.map((t) => {
          const assignment = t.assigned_classrooms?.find(c => c.classroom_id === classroomId);
          const roleLabels: Record<string, string> = { homeroom: 'ครูที่ปรึกษา', assistant: 'ผู้ช่วย', subject: 'ครูวิชา', discipline: 'ฝ่ายปกครอง' };
          return (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.full_name}</TableCell>
              <TableCell>
                <Badge variant="outline">{roleLabels[assignment?.assignment_role || ''] || assignment?.assignment_role}</Badge>
              </TableCell>
              <TableCell>
                {onRemove && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(t.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
