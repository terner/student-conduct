'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StudentDetail } from '@/components/features/students/student-detail';
import { getStudent } from '@/lib/actions/student.action';
import { getStudentSummary } from '@/lib/actions/score.action';
import { getIndividualReport } from '@/lib/actions/report.action';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentWithProfile | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const id = params.id as string;
      const [studentRes, reportRes] = await Promise.all([
        getStudent(id),
        getIndividualReport(id),
      ]);

      if (studentRes.success && studentRes.data) {
        setStudent(studentRes.data as StudentWithProfile);
      } else {
        setError('ไม่พบข้อมูลนักเรียน');
      }

      if (reportRes.success && reportRes.data) {
        setReportData(reportRes.data);
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

  if (error || !student) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error || 'ไม่พบข้อมูลนักเรียน'}</span>
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/students')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{student.first_name} {student.last_name}</h1>
          <p className="text-muted-foreground text-sm">รหัสนักเรียน: {student.student_id_number}</p>
        </div>
      </div>

      <StudentDetail student={student} scoreSummary={reportData?.summary} />

      {reportData?.transactions && reportData.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ประวัติคะแนน</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>คะแนน</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                  <TableHead>บันทึกโดย</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.transactions.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">
                      {new Date(t.recorded_at).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell>{t.category_name}</TableCell>
                    <TableCell>
                      <span className={t.points > 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {t.note || '-'}
                    </TableCell>
                    <TableCell className="text-xs">{t.recorded_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(!reportData?.transactions || reportData.transactions.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            ยังไม่มีประวัติการบันทึกคะแนน
          </CardContent>
        </Card>
      )}
    </div>
  );
}
