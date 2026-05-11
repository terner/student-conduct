'use client';

import { ImageIcon, Phone, School, ShieldCheck, User, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';

interface StudentDetailProps {
  student: StudentWithProfile;
  scoreSummary?: {
    current_score: number;
    total_deducted: number;
    total_added: number;
  };
}

export function StudentDetail({ student, scoreSummary }: StudentDetailProps) {
  return (
    <div className="grid gap-4 print:grid-cols-3 print:gap-3 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-4 print:contents md:grid-cols-2">
      <Card className="print:order-1 print:col-span-2 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
        <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
          <CardTitle className="flex items-center gap-2 text-lg print:text-[12px] print:font-semibold">
            <User className="h-5 w-5 text-muted-foreground print:hidden" />
            ข้อมูลนักเรียน
          </CardTitle>
        </CardHeader>
        <CardContent className="print:grid print:grid-cols-[64px_1fr] print:gap-3 print:px-3 print:py-2">
          <div className="mb-4 flex items-center gap-4 print:mb-0 print:block">
            {student.avatar_url ? (
              <img
                src={student.avatar_url}
                alt={`รูปนักเรียน ${student.prefix}${student.first_name} ${student.last_name}`}
                className="size-20 rounded-lg border object-cover print:size-16 print:rounded-md"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground print:size-16 print:rounded-md">
                <ImageIcon className="size-7 print:size-5" />
              </div>
            )}
            <div className="min-w-0 print:hidden">
              <p className="truncate font-medium">{student.prefix}{student.first_name} {student.last_name}</p>
              <p className="font-mono text-xs text-muted-foreground">{student.student_id_number}</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm print:grid print:grid-cols-2 print:gap-x-5 print:gap-y-1.5 print:space-y-0 print:text-[11px]">
            <InfoRow
              label="ชื่อ-นามสกุล"
              value={`${student.prefix}${student.first_name} ${student.last_name}`}
              strong
              className="hidden print:col-span-2 print:block"
              valueClassName="print:mt-0.5 print:text-left print:text-[13px] print:leading-snug"
            />
            <InfoRow label="รหัสนักเรียน" value={student.student_id_number} mono />
            <div className="flex items-start justify-between gap-3 print:col-start-1 print:row-start-3 print:min-w-0">
              <dt className="text-muted-foreground">สถานะ</dt>
              <dd className="text-right">
                <Badge
                  variant="outline"
                  className={student.current_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}
                >
                  {student.current_status === 'active' ? 'กำลังศึกษา' : student.current_status}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="print:order-3 print:col-span-1 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
        <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
          <CardTitle className="flex items-center gap-2 text-lg print:text-[12px] print:font-semibold">
            <School className="h-5 w-5 text-muted-foreground print:hidden" />
            ห้องเรียน
          </CardTitle>
        </CardHeader>
        <CardContent className="print:px-3 print:py-2">
          <dl className="space-y-3 text-sm print:space-y-1.5 print:text-[11px]">
            <InfoRow label="ห้องเรียน" value={student.classroom_name || '-'} strong />
            <InfoRow label="ระดับ" value={student.education_stage_name || '-'} />
          </dl>
        </CardContent>
      </Card>

      <Card className="print:order-4 print:col-span-1 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
        <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
          <CardTitle className="flex items-center gap-2 text-lg print:text-[12px] print:font-semibold">
            <ShieldCheck className="h-5 w-5 text-muted-foreground print:hidden" />
            ครูดูแล
          </CardTitle>
        </CardHeader>
        <CardContent className="print:px-3 print:py-2">
          <dl className="space-y-3 text-sm print:space-y-1.5 print:text-[11px]">
            <InfoRow label="ครูประจำชั้น" value={student.homeroom_teacher_name || '-'} />
            <InfoRow label="ครูที่ปรึกษา" value={student.advisor_teacher_name || '-'} />
          </dl>
        </CardContent>
      </Card>

      <Card className="print:order-5 print:col-span-1 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
        <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
          <CardTitle className="flex items-center gap-2 text-lg print:text-[12px] print:font-semibold">
            <Users className="h-5 w-5 text-muted-foreground print:hidden" />
            ผู้ปกครอง
          </CardTitle>
        </CardHeader>
        <CardContent className="print:px-3 print:py-2">
          <dl className="space-y-3 text-sm print:space-y-1.5 print:text-[11px]">
            <InfoRow label="ชื่อผู้ปกครอง" value={student.guardian_full_name || '-'} />
            <InfoRow label="ความสัมพันธ์" value={formatGuardianRelation(student.guardian_relation)} />
            <InfoRow
              label="เบอร์โทร"
              value={student.guardian_phone || '-'}
              icon={student.guardian_phone ? <Phone className="h-3.5 w-3.5" /> : undefined}
            />
          </dl>
        </CardContent>
      </Card>
      </div>

      <Card className="print:order-2 print:col-span-1 print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none xl:sticky xl:top-20 xl:self-start">
        <CardHeader className="print:border-b print:bg-neutral-900 print:px-3 print:py-2 print:text-white">
          <CardTitle className="text-lg print:text-[12px] print:font-semibold">คะแนนความประพฤติ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 print:space-y-1.5 print:px-3 print:py-2">
          <div className="rounded-md border bg-muted/30 px-4 py-5 text-center print:border-neutral-300 print:bg-neutral-50 print:px-2 print:py-2">
            <div className="text-4xl font-bold leading-none print:text-2xl">{scoreSummary?.current_score ?? '-'}</div>
            <p className="mt-1 text-xs text-muted-foreground print:text-[10px]">คะแนนปัจจุบัน</p>
          </div>
          <Separator className="print:bg-neutral-300" />
          <div className="grid grid-cols-2 gap-3 text-sm print:gap-1.5 print:text-[10px]">
            <div className="rounded-md border p-3 print:border-neutral-300 print:p-2">
              <p className="text-xs text-muted-foreground">ถูกหัก</p>
              <p className="mt-1 text-lg font-semibold text-destructive print:text-xs">{scoreSummary?.total_deducted ?? 0}</p>
            </div>
            <div className="rounded-md border p-3 print:border-neutral-300 print:p-2">
              <p className="text-xs text-muted-foreground">ได้เพิ่ม</p>
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

function formatGuardianRelation(relation?: string) {
  const labels: Record<string, string> = {
    father: 'บิดา',
    mother: 'มารดา',
    guardian: 'ผู้ปกครอง',
    relative: 'ญาติ',
    other: 'อื่น ๆ',
  };
  return relation ? labels[relation] || relation : '-';
}
