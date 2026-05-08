'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Building, BookOpen, Mail, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTeacher } from '@/lib/actions/teacher.action';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';

export default function TeacherDetailPage() {
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
        setError('ไม่พบข้อมูลครู');
      }

      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error || 'ไม่พบข้อมูลครู'}</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/teachers')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{teacher.full_name}</h1>
          <p className="text-muted-foreground text-sm">รหัสเจ้าหน้าที่: {teacher.employee_id}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ข้อมูลทั่วไป</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{teacher.email || 'ไม่มีอีเมล'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{teacher.department || 'ไม่มีแผนก'}</span>
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">{teacher.employee_id}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ห้องเรียนที่ปรึกษา</CardTitle>
          </CardHeader>
          <CardContent>
            {teacher.assigned_classrooms && teacher.assigned_classrooms.length > 0 ? (
              <div className="space-y-2">
                {teacher.assigned_classrooms.map((c) => (
                  <div key={c.classroom_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{c.classroom_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.education_stage === 'primary' ? 'ประถม' : 'มัธยม'}ศึกษา ป.{c.grade_level}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {c.assignment_role === 'homeroom' ? 'ครูที่ปรึกษา' : c.assignment_role}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีห้องเรียนที่ปรึกษา</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
