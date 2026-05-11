'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import { useTranslations } from 'next-intl';

interface TeacherAssignmentTableProps {
  classroomId: string;
  teachers: TeacherWithProfile[];
  onAssign?: (role: 'homeroom' | 'assistant', teacherId: string) => void;
}

export function TeacherAssignmentTable({ teachers, classroomId, onAssign }: TeacherAssignmentTableProps) {
  const classroomT = useTranslations('classroom');
  const homeroomTeacher = teachers.find(t =>
    t.assigned_classrooms?.some(c => c.classroom_id === classroomId && c.assignment_role === 'homeroom')
  );
  const assistantTeacher = teachers.find(t =>
    t.assigned_classrooms?.some(c => c.classroom_id === classroomId && c.assignment_role === 'assistant')
  );
  const advisorTeacher = assistantTeacher || homeroomTeacher;

  function teacherLabel(teacherId: string) {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher?.full_name || teacher?.employee_id || '';
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>{classroomT('homeroomTeacher')}</Label>
        <Select
          value={homeroomTeacher?.id || null}
          onValueChange={(value) => value && onAssign?.('homeroom', value)}
          itemToStringLabel={(value) => teacherLabel(String(value))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={classroomT('selectHomeroomTeacher')} />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id} label={teacher.full_name || teacher.employee_id}>
                {teacher.full_name || teacher.employee_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{classroomT('advisorTeacher')}</Label>
        <Select
          value={advisorTeacher?.id || null}
          onValueChange={(value) => value && onAssign?.('assistant', value)}
          itemToStringLabel={(value) => teacherLabel(String(value))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={classroomT('selectAdvisorTeacher')} />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id} label={teacher.full_name || teacher.employee_id}>
                {teacher.full_name || teacher.employee_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
