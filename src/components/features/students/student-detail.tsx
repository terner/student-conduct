'use client';

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
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">ข้อมูลนักเรียน</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">รหัสนักเรียน</dt>
              <dd className="font-mono font-medium">{student.student_id_number}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ชื่อ-นามสกุล</dt>
              <dd className="font-medium">{student.first_name} {student.last_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ห้องเรียน</dt>
              <dd>{student.classroom_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ชั้นปี</dt>
              <dd>ป.{student.grade_level}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">ระดับ</dt>
              <dd>{student.education_stage === 'primary' ? 'ประถมศึกษา' : 'มัธยมศึกษา'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">สถานะ</dt>
              <dd>
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

      {scoreSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">คะแนนความประพฤติ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-3xl font-bold">{scoreSummary.current_score}</div>
              <p className="text-xs text-muted-foreground">คะแนนปัจจุบัน</p>
            </div>
            <Separator />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ถูกหัก</span>
              <span className="font-medium text-destructive">{scoreSummary.total_deducted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ได้เพิ่ม</span>
              <span className="font-medium text-green-600">+{scoreSummary.total_added}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
