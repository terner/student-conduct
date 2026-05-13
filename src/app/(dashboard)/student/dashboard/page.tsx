'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { StudentDetail } from '@/components/features/students/student-detail';
import { getStudentDashboard } from '@/lib/actions/student.action';
import { checkMustChangePassword, checkPDPAConsent } from '@/lib/actions/dashboard.action';
import { useTranslations } from 'next-intl';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function StudentDashboardPage() {
  const studentT = useTranslations('student');
  const scoreT = useTranslations('score');
  const commonT = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const passwordRes = await checkMustChangePassword();
      if (passwordRes.success && passwordRes.data?.must_change_password) {
        router.replace('/change-password');
        return;
      }

      const consentRes = await checkPDPAConsent();
      if (consentRes.success && consentRes.data && !consentRes.data.consented) {
        router.replace('/pdpa-consent');
        return;
      }

      const res = await getStudentDashboard();
      if (res.success && res.data) {
        setStudentInfo(res.data.student);
        setSummary(res.data.summary);
        setTransactions(res.data.transactions || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{studentT('myScoreTitle')}</h1>
        <p className="text-muted-foreground mt-1">{studentT('myScoreDescription')}</p>
      </div>

      {studentInfo && (
        <StudentDetail
          student={{
            ...studentInfo,
            first_name: studentInfo.first_name || studentInfo.full_name || '',
            last_name: studentInfo.last_name || '',
            classroom_name: studentInfo.classroom_name || '',
            education_stage_name: studentInfo.education_stage_name || '',
            homeroom_teacher_name: studentInfo.homeroom_teacher_name || '',
            advisor_teacher_name: studentInfo.advisor_teacher_name || '',
            guardian_full_name: studentInfo.guardian_full_name || '',
            guardian_relation: studentInfo.guardian_relation || '',
            guardian_phone: studentInfo.guardian_phone || '',
            current_status: studentInfo.current_status || 'active',
          }}
          scoreSummary={summary}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{studentT('scoreHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">{studentT('noScoreHistory')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{scoreT('date')}</TableHead>
                  <TableHead>{scoreT('type')}</TableHead>
                  <TableHead>{scoreT('points')}</TableHead>
                  <TableHead>{studentT('note')}</TableHead>
                  <TableHead>{scoreT('recordedBy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{formatDateTime(t.recorded_at)}</TableCell>
                    <TableCell>{t.category_name || commonT('notAvailable')}</TableCell>
                    <TableCell>
                      <span className={t.points > 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.note || commonT('notAvailable')}</TableCell>
                    <TableCell className="text-xs">{t.recorded_by_name || commonT('notAvailable')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
