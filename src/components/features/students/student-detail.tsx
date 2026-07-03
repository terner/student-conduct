'use client';

import Image from 'next/image';
import { ImageIcon, Phone, School, ShieldCheck, User, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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

  function getStatusLabel(status?: string | null) {
    switch (status) {
      case 'active':
        return studentT('statusActive');
      case 'inactive':
        return studentT('statusInactive');
      case 'transferred':
        return studentT('statusTransferred');
      case 'graduated':
        return studentT('statusGraduated');
      case 'suspended':
        return studentT('statusSuspended');
      default:
        return status || commonT('notAvailable');
    }
  }

  function formatGuardianRelation(relation?: string) {
    const labels: Record<string, string> = {
      father: settingsRelation('sampleFather'),
      mother: settingsRelation('sampleMother'),
      guardian: studentT('guardian'),
      relative: studentT('guardianRelationRelative'),
      other: studentT('guardianRelationOther'),
    };
    return relation ? labels[relation] || relation : commonT('notAvailable');
  }

  function settingsRelation(key: 'sampleFather' | 'sampleMother') {
    return key === 'sampleFather' ? studentT('guardianRelationFather') : studentT('guardianRelationMother');
  }

  return (
    <div className="grid gap-4 print:grid-cols-3 print:gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid min-w-0 gap-4 print:contents md:grid-cols-2">
      <Card className="md:col-span-2 print:order-1 print:col-span-2 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
        <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
          <CardTitle className="flex items-center gap-2 text-lg print:text-[12px] print:font-semibold">
            <User className="h-5 w-5 text-muted-foreground print:hidden" />
            {studentT('detail')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[96px_1fr] print:grid-cols-[64px_1fr] print:gap-3 print:px-3 print:py-2">
          <div className="flex items-center gap-4 sm:block print:block">
            {student.avatar_url ? (
              <Image
                src={student.avatar_url}
                alt={studentT('studentPhotoAlt', { name: `${student.prefix}${student.first_name} ${student.last_name}` })}
                width={96}
                height={96}
                unoptimized
                className="size-20 rounded-lg border object-cover sm:size-24 print:size-16 print:rounded-md"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground sm:size-24 print:size-16 print:rounded-md">
                <ImageIcon className="size-7 print:size-5" />
              </div>
            )}
            <div className="min-w-0 print:hidden">
              <p className="truncate font-medium">{student.prefix}{student.first_name} {student.last_name}</p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 print:grid-cols-2 print:gap-x-5 print:gap-y-1.5 print:text-[11px]">
            <InfoRow
              label={studentT('fullName')}
              value={`${student.prefix}${student.first_name} ${student.last_name}`}
              strong
              className="hidden print:col-span-2 print:block"
              valueClassName="print:mt-0.5 print:text-left print:text-[13px] print:leading-snug"
            />
            <InfoRow label={studentT('id')} value={student.student_id_number} mono />
            <div className="flex items-start justify-between gap-3 print:col-start-1 print:row-start-3 print:min-w-0">
              <dt className="text-muted-foreground">{studentT('status')}</dt>
              <dd className="text-right">
                <Badge
                  variant="outline"
                  className={student.current_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}
                >
                  {getStatusLabel(student.current_status)}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="print:order-5 print:col-span-1 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
        <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
          <CardTitle className="flex items-center gap-2 text-lg print:text-[12px] print:font-semibold">
            <Users className="h-5 w-5 text-muted-foreground print:hidden" />
            {studentT('guardian')}
          </CardTitle>
        </CardHeader>
        <CardContent className="print:px-3 print:py-2">
          <dl className="space-y-3 text-sm print:space-y-1.5 print:text-[11px]">
            <InfoRow label={studentT('guardianName')} value={student.guardian_full_name || commonT('notAvailable')} />
            <InfoRow label={studentT('guardianRelation')} value={formatGuardianRelation(student.guardian_relation)} />
            <InfoRow
              label={studentT('guardianPhoneShort')}
              value={formatPhoneDisplay(student.guardian_phone) || commonT('notAvailable')}
              icon={student.guardian_phone ? <Phone className="h-3.5 w-3.5" /> : undefined}
            />
          </dl>
        </CardContent>
      </Card>

      <Card className="print:order-3 print:col-span-1 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
        <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
          <CardTitle className="flex items-center gap-2 text-lg print:text-[12px] print:font-semibold">
            <School className="h-5 w-5 text-muted-foreground print:hidden" />
            {studentT('classroomFull')}
          </CardTitle>
        </CardHeader>
        <CardContent className="print:px-3 print:py-2">
          <dl className="space-y-3 text-sm print:space-y-1.5 print:text-[11px]">
            <InfoRow label={studentT('classroomFull')} value={student.classroom_name || commonT('notAvailable')} strong />
            <InfoRow label={studentT('stage')} value={student.education_stage_name || commonT('notAvailable')} />
          </dl>
        </CardContent>
      </Card>

      <Card className="print:order-4 print:col-span-1 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
        <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
          <CardTitle className="flex items-center gap-2 text-lg print:text-[12px] print:font-semibold">
            <ShieldCheck className="h-5 w-5 text-muted-foreground print:hidden" />
            {studentT('careTeachers')}
          </CardTitle>
        </CardHeader>
        <CardContent className="print:px-3 print:py-2">
          <dl className="space-y-3 text-sm print:space-y-1.5 print:text-[11px]">
            <InfoRow label={classroomT('homeroomTeacher')} value={student.homeroom_teacher_name || commonT('notAvailable')} />
            <InfoRow label={classroomT('advisorTeacher')} value={student.advisor_teacher_name || commonT('notAvailable')} />
          </dl>
        </CardContent>
      </Card>
      </div>

      <Card className="print:order-2 print:col-span-1 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none xl:sticky xl:top-4 xl:self-start">
        <CardHeader className="border-b bg-muted/30 print:border-b print:bg-neutral-900 print:px-3 print:py-2 print:text-white">
          <CardTitle className="text-lg print:text-[12px] print:font-semibold">{studentT('conductScore')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 print:space-y-1.5 print:px-3 print:py-2">
          <div className="rounded-md border bg-muted/30 px-4 py-5 text-center print:border-neutral-300 print:bg-neutral-50 print:px-2 print:py-2">
            <div className="text-4xl font-bold leading-none print:text-2xl">{scoreSummary ? (scoreSummary.current_score > 100 ? '100+' : scoreSummary.current_score) : commonT('notAvailable')}</div>
            <p className="mt-1 text-xs text-muted-foreground print:text-[10px]">{studentT('score')}</p>
          </div>
          <Separator className="print:bg-neutral-300" />
          <div className="grid grid-cols-2 gap-3 text-sm print:gap-1.5 print:text-[10px]">
            <div className="rounded-md border p-3 print:border-neutral-300 print:p-2">
              <p className="text-xs text-muted-foreground">{studentT('deducted')}</p>
              <p className="mt-1 text-lg font-semibold text-destructive print:text-xs">{scoreSummary?.total_deducted ?? 0}</p>
            </div>
            <div className="rounded-md border p-3 print:border-neutral-300 print:p-2">
              <p className="text-xs text-muted-foreground">{studentT('added')}</p>
              <p className="mt-1 text-lg font-semibold text-green-600 print:text-xs">+{scoreSummary?.total_added ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  strong,
  mono,
  icon,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
  icon?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className || ''}`}>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`min-w-0 text-right ${strong ? 'font-medium' : ''} ${mono ? 'font-mono' : ''} ${valueClassName || ''}`}>
        <span className="inline-flex items-center justify-end gap-1 break-words">
          {icon}
          {value}
        </span>
      </dd>
    </div>
  );
}
