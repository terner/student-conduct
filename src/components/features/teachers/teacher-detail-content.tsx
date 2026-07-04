'use client';

import { useMemo } from 'react';
import { BadgeCheck, BookOpen, Building, Mail, Phone, UserCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatPhoneDisplay } from '@/lib/phone';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import { useTranslations } from 'next-intl';

interface TeacherDetailContentProps {
  teacher: TeacherWithProfile;
}

export function TeacherDetailContent({
  teacher,
}: TeacherDetailContentProps) {
  const teacherT = useTranslations('teacher');
  const classroomT = useTranslations('classroom');

  const { homeroomClassrooms, assistantClassrooms } = useMemo(() => {
    const all = teacher.assigned_classrooms || [];
    return {
      homeroomClassrooms: all.filter((classroom) => classroom.assignment_role === 'homeroom'),
      assistantClassrooms: all.filter((classroom) => classroom.assignment_role === 'assistant'),
    };
  }, [teacher]);

  return (
    <div className="overflow-x-hidden">
      <div className="grid gap-4 px-4 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <section className="space-y-4">
          <SectionBlock title={teacherT('generalInfo')}>
            <InfoRow icon={<Mail className="h-4 w-4" />} label={teacherT('email')} value={teacher.email ?? teacherT('noEmail')} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label={teacherT('phone')} value={formatPhoneDisplay(teacher.phone) || teacherT('noPhone')} />
            <InfoRow icon={<Building className="h-4 w-4" />} label={teacherT('department')} value={teacher.department ?? teacherT('noDepartment')} />
            <InfoRow icon={<BadgeCheck className="h-4 w-4" />} label={teacherT('employeeId')} value={teacher.employee_id} mono />
          </SectionBlock>
        </section>

        <section className="min-w-0 space-y-4">
          <SectionBlock
            title={teacherT('advisorClassrooms')}
            description={teacherT('classroomCountShort', { count: homeroomClassrooms.length + assistantClassrooms.length })}
          >
            <ClassroomGroup
              title={classroomT('homeroomTeacher')}
              icon={<UserCheck className="h-4 w-4" />}
              count={homeroomClassrooms.length}
              classrooms={homeroomClassrooms}
              variant="homeroom"
              emptyLabel={teacherT('noAdvisorClassrooms')}
              gradeLabel={(grade) => teacherT('gradePrefix', { grade })}
            />

            <ClassroomGroup
              title={teacherT('assistantClassrooms')}
              icon={<Users className="h-4 w-4" />}
              count={assistantClassrooms.length}
              classrooms={assistantClassrooms}
              variant="assistant"
              emptyLabel={teacherT('noAdvisorClassrooms')}
              gradeLabel={(grade) => teacherT('gradePrefix', { grade })}
            />
          </SectionBlock>
        </section>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
        </div>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border px-3 py-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`break-words text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function ClassroomGroup({
  title,
  icon,
  count,
  classrooms,
  variant,
  emptyLabel,
  gradeLabel,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  classrooms: Array<{ classroom_id: string; classroom_name: string; education_stage_name: string; grade_level: number }>;
  variant: 'homeroom' | 'assistant';
  emptyLabel: string;
  gradeLabel: (grade: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`flex size-7 items-center justify-center rounded-md ${variant === 'homeroom' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
          {icon}
        </div>
        <p className="text-sm font-medium">{title}</p>
        <Badge variant={variant === 'homeroom' ? 'secondary' : 'outline'} className="text-xs">
          {count}
        </Badge>
      </div>

      {classrooms.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {classrooms.map((classroom) => (
            <div
              key={classroom.classroom_id}
              className={`rounded-lg border px-3 py-3 ${variant === 'homeroom' ? 'border-primary/25 bg-primary/5' : 'bg-muted/20'}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${variant === 'homeroom' ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'}`}>
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{classroom.classroom_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[classroom.education_stage_name, gradeLabel(classroom.grade_level)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
