'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Building, BookOpen, Mail, BadgeCheck, Phone, ShieldCheck, Image as ImageIcon, Users, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getTeacher } from '@/lib/actions/teacher.action';
import { formatPhoneDisplay } from '@/lib/phone';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import { useTranslations } from 'next-intl';

export default function TeacherDetailPage() {
  const teacherT = useTranslations('teacher');
  const commonT = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const [teacher, setTeacher] = useState<TeacherWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const id = params.id as string;
      const res = await getTeacher(id);

      if (res.success && res.data) {
        setTeacher(res.data as TeacherWithProfile);
      } else {
        setError(teacherT('notFound'));
      }

      setLoading(false);
    }
    load();
  }, [params.id, teacherT]);

  const { homeroomClassrooms, assistantClassrooms } = useMemo(() => {
    const all = teacher?.assigned_classrooms || [];
    return {
      homeroomClassrooms: all.filter(c => c.assignment_role === 'homeroom'),
      assistantClassrooms: all.filter(c => c.assignment_role === 'assistant'),
    };
  }, [teacher]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error || teacherT('notFound')}</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {commonT('back')}
        </Button>
      </div>
    );
  }

  const isSuperAdmin = teacher.roles?.includes('superadmin');
  const isAdmin = teacher.roles?.includes('admin') && !isSuperAdmin;

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/teachers')} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {teacherT('title')}
      </Button>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {teacher.avatar_url ? (
          <img src={teacher.avatar_url} alt={teacher.full_name || ''} className="size-24 rounded-2xl border-2 border-border object-cover shadow-sm" />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 text-muted-foreground">
            <ImageIcon className="size-10" />
          </div>
        )}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">{teacher.full_name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{teacher.position || teacherT('teacher')}</span>
            {teacher.employee_id && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <span className="font-mono text-xs">{teacher.employee_id}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant={teacher.is_active !== false ? 'default' : 'outline'}>
              {teacher.is_active !== false ? commonT('active') : commonT('inactive')}
            </Badge>
            {isSuperAdmin && <Badge><ShieldCheck className="mr-1 h-3 w-3" />{teacherT('superadmin')}</Badge>}
            {isAdmin && <Badge><ShieldCheck className="mr-1 h-3 w-3" />{teacherT('admin')}</Badge>}
            <Badge variant="secondary">{teacherT('teacher')}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Contact Info */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{teacherT('generalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoTile icon={<Mail className="h-4 w-4" />} label={teacherT('email')} value={teacher.email || teacherT('noEmail')} />
            <InfoTile icon={<Phone className="h-4 w-4" />} label={teacherT('phone')} value={formatPhoneDisplay(teacher.phone) || teacherT('noPhone')} />
            <InfoTile icon={<Building className="h-4 w-4" />} label={teacherT('department')} value={teacher.department || teacherT('noDepartment')} />
            <InfoTile icon={<BadgeCheck className="h-4 w-4" />} label={teacherT('employeeId')} value={teacher.employee_id || commonT('notAvailable')} mono />
          </CardContent>
        </Card>

        {/* Classrooms */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{teacherT('advisorClassrooms')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Homeroom */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">ครูประจำชั้น</p>
                <Badge variant="secondary" className="text-xs">{homeroomClassrooms.length} ห้อง</Badge>
              </div>
              {homeroomClassrooms.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {homeroomClassrooms.map(c => (
                    <ClassroomCard key={c.classroom_id} classroom={c} variant="homeroom" gradePrefix={teacherT('gradePrefix', { grade: c.grade_level })} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-1">—</p>
              )}
            </div>

            {/* Assistant */}
            {assistantClassrooms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">ครูผู้ช่วย</p>
                  <Badge variant="outline" className="text-xs">{assistantClassrooms.length} ห้อง</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {assistantClassrooms.map(c => (
                    <ClassroomCard key={c.classroom_id} classroom={c} variant="assistant" gradePrefix={teacherT('gradePrefix', { grade: c.grade_level })} />
                  ))}
                </div>
              </div>
            )}

            {homeroomClassrooms.length === 0 && assistantClassrooms.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 opacity-30" />
                <p className="text-sm">{teacherT('noAdvisorClassrooms')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function ClassroomCard({ classroom, variant, gradePrefix }: { classroom: { classroom_id: string; classroom_name: string; education_stage_name: string; grade_level: number }; variant: 'homeroom' | 'assistant'; gradePrefix: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${variant === 'homeroom' ? 'border-primary/30 bg-primary/5' : ''}`}>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${variant === 'homeroom' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
        <BookOpen className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{classroom.classroom_name}</p>
        <p className="text-xs text-muted-foreground">
          {classroom.education_stage_name || ''} · {gradePrefix}
        </p>
      </div>
    </div>
  );
}
