'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { TeacherAssignmentTable } from '@/components/features/classrooms/teacher-table';
import { StudentTable } from '@/components/features/students/student-table';
import { getClassroom } from '@/lib/actions/classroom.action';
import { getStudents } from '@/lib/actions/student.action';
import { getTeachers } from '@/lib/actions/teacher.action';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';

export default function ClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [classroom, setClassroom] = useState<ClassroomWithDetails | null>(null);
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [teachers, setTeachers] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const id = params.id as string;
      const [classRes, studentRes, teacherRes] = await Promise.all([
        getClassroom(id),
        getStudents({ classroom_id: id, page_size: 100 }),
        getTeachers(),
      ]);

      if (classRes.success && classRes.data) setClassroom(classRes.data);
      else setError('ไม่พบห้องเรียน');
      if (studentRes.success && studentRes.data) setStudents(studentRes.data.data as unknown as StudentWithProfile[]);
      if (teacherRes.success && teacherRes.data) setTeachers(teacherRes.data);

      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div></div>;
  if (error) return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" /><span>{error}</span></div>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />กลับ</Button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/classrooms')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">{classroom?.name}</h1>
          <p className="text-muted-foreground text-sm">
            {classroom?.education_stage === 'primary' ? 'ประถมศึกษา' : 'มัธยมศึกษา'} · ป.{classroom?.grade_level} · {classroom?.student_count} คน
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">ครูประจำชั้น</CardTitle></CardHeader>
          <CardContent>
            <TeacherAssignmentTable classroomId={params.id as string} teachers={teachers} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">สถิติห้องเรียน</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{classroom?.student_count || 0}</div>
              <div className="text-xs text-muted-foreground">นักเรียน</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{classroom?.teacher_count || 0}</div>
              <div className="text-xs text-muted-foreground">ครู</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">นักเรียนในห้อง</CardTitle></CardHeader>
        <CardContent>
          <StudentTable data={students} />
        </CardContent>
      </Card>
    </div>
  );
}
