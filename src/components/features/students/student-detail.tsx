'use client';

import { Phone, School, ShieldCheck, Users } from 'lucide-react';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';
import { useTranslations } from 'next-intl';
import { formatPhoneDisplay } from '@/lib/phone';

interface StudentDetailProps {
  student: StudentWithProfile;
  scoreSummary?: {
    current_score: number;
    total_deducted: number;
    total_added: number;
  };
}

export function StudentDetail({ student, scoreSummary }: StudentDetailProps) {
  const studentT = useTranslations('student');
  const classroomT = useTranslations('classroom');
  const commonT = useTranslations('common');

  const guardianRelationLabels: Record<string, string> = {
    father: studentT('guardianRelationFather'),
    mother: studentT('guardianRelationMother'),
    guardian: studentT('guardian'),
    relative: studentT('guardianRelationRelative'),
    other: studentT('guardianRelationOther'),
  };
  const classroomName = student.classroom_name || studentT('classroomNotSpecified');
  const classNumber = student.class_number == null ? commonT('notSpecified') : String(student.class_number);
  const stageName = student.education_stage_name || commonT('notSpecified');
  const guardianName = student.guardian_full_name || commonT('notSpecified');
  const guardianRelation = student.guardian_relation ? guardianRelationLabels[student.guardian_relation] ?? commonT('notSpecified') : commonT('notSpecified');
  const guardianPhone = student.guardian_phone ? formatPhoneDisplay(student.guardian_phone) : commonT('notSpecified');
  const homeroomTeacher = student.homeroom_teacher_name || commonT('notSpecified');
  const advisorTeacher = student.advisor_teacher_name || commonT('notSpecified');
  const scoreText = scoreSummary
    ? (scoreSummary.current_score > 100 ? studentT('scoreCapped') : String(scoreSummary.current_score))
    : commonT('notAvailable');

  return (
    <div className="grid gap-5 print:grid-cols-[minmax(0,1fr)_220px] print:gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5 print:space-y-3">
        <div className="grid gap-5 lg:grid-cols-2 print:grid-cols-2 print:gap-3">
          <InfoSection title={studentT('guardian')} icon={<Users className="h-4 w-4" />}>
            <InfoRow label={studentT('guardianName')} value={guardianName} />
            <InfoRow label={studentT('guardianRelation')} value={guardianRelation} />
            <InfoRow label={studentT('guardianPhoneShort')} value={guardianPhone} icon={student.guardian_phone ? <Phone className="h-3.5 w-3.5" /> : undefined} />
          </InfoSection>

          <InfoSection title={studentT('classroomFull')} icon={<School className="h-4 w-4" />}>
            <InfoRow label={studentT('classroomFull')} value={classroomName} />
            <InfoRow label={studentT('stage')} value={stageName} />
            <InfoRow label={studentT('classNumber')} value={classNumber} />
          </InfoSection>
        </div>

        <InfoSection title={studentT('careTeachers')} icon={<ShieldCheck className="h-4 w-4" />}>
          <div className="grid gap-3 lg:grid-cols-2 print:grid-cols-2">
            <InfoRow label={classroomT('homeroomTeacher')} value={homeroomTeacher} />
            <InfoRow label={classroomT('advisorTeacher')} value={advisorTeacher} />
          </div>
        </InfoSection>
      </div>

      <aside className="print:col-start-2 xl:sticky xl:top-4 xl:self-start">
        <section className="overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/10 print:break-inside-avoid print:rounded-md print:border-neutral-300 print:bg-white print:ring-0">
          <div className="border-b bg-muted/40 px-4 py-3 print:border-neutral-300 print:bg-neutral-50 print:px-3 print:py-2">
            <p className="text-sm font-medium print:text-[11px]">{studentT('conductScore')}</p>
          </div>
          <div className="space-y-4 px-4 py-4 print:space-y-2 print:px-3 print:py-3">
            <div className="rounded-lg border bg-background px-4 py-5 text-center print:rounded-md print:border-neutral-300 print:px-2 print:py-3">
              <div className="text-5xl font-semibold leading-none print:text-3xl">{scoreText}</div>
              <p className="mt-1 text-xs text-muted-foreground print:text-[10px]">{studentT('score')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 print:gap-2">
              <ScoreBlock label={studentT('deducted')} value={String(scoreSummary?.total_deducted ?? 0)} tone="negative" />
              <ScoreBlock label={studentT('added')} value={`+${scoreSummary?.total_added ?? 0}`} tone="positive" />
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function InfoSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card ring-1 ring-foreground/10 print:break-inside-avoid print:rounded-md print:border-neutral-300 print:bg-white print:ring-0">
      <div className="border-b px-4 py-3 print:border-neutral-300 print:bg-neutral-50 print:px-3 print:py-2">
        <div className="flex items-center gap-2 text-sm font-medium print:text-[11px]">
          <span className="text-muted-foreground print:hidden">{icon}</span>
          <span>{title}</span>
        </div>
      </div>
      <div className="space-y-3 px-4 py-4 print:space-y-2 print:px-3 print:py-3">
        {children}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="text-sm text-muted-foreground print:text-[10px]">{label}</div>
      <div className="min-w-0 text-sm font-medium leading-snug sm:text-right print:text-[11px]">
        <span className="inline-flex items-center gap-1 break-words sm:justify-end">
          {icon}
          {value}
        </span>
      </div>
    </div>
  );
}

function ScoreBlock({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'negative' | 'positive';
}) {
  return (
    <div className="rounded-lg border px-3 py-3 print:rounded-md print:border-neutral-300 print:px-2 print:py-2">
      <p className="text-xs text-muted-foreground print:text-[10px]">{label}</p>
      <p className={`mt-1 text-lg font-semibold leading-none print:text-sm ${tone === 'negative' ? 'text-destructive' : 'text-green-600'}`}>
        {value}
      </p>
    </div>
  );
}
