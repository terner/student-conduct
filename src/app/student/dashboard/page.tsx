'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
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
  const classroomT = useTranslations('classroom');
  const scoreT = useTranslations('score');
  const commonT = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      // Check must_change_password first
      const passwordRes = await checkMustChangePassword();
      if (passwordRes.success && passwordRes.data?.must_change_password) {
        router.replace('/change-password');
        return;
      }

      // Check PDPA consent
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {studentInfo.prefix || ''}{studentInfo.first_name || studentInfo.full_name || ''} {studentInfo.last_name || ''}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {studentInfo.classroom_name || studentT('classroomNotSpecified')}
              {studentInfo.class_number ? ` · ${studentT('classNumber')} ${studentInfo.class_number}` : ''}
              {studentInfo.education_stage_name ? ` · ${studentInfo.education_stage_name}` : ''}
            </p>
            <p className="text-sm text-muted-foreground">
              {studentT('id')}: {studentInfo.student_id_number}
              {studentInfo.current_status ? ` · ${studentT('status')}: ${studentInfo.current_status}` : ''}
            </p>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{classroomT('homeroomTeacher')}</dt>
                <dd className="font-medium">{studentInfo.homeroom_teacher_name || commonT('notAvailable')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{classroomT('advisorTeacher')}</dt>
                <dd className="font-medium">{studentInfo.advisor_teacher_name || commonT('notAvailable')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{studentT('guardianName')}</dt>
                <dd className="font-medium">{studentInfo.guardian_full_name || commonT('notAvailable')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{studentT('guardianPhone')}</dt>
                <dd className="font-medium">{studentInfo.guardian_phone || commonT('notAvailable')}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {summary && (
        <div className="grid gap-4 grid-cols-3">
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-3xl font-bold">{summary.current_score}</div>
            <div className="text-xs text-muted-foreground">{studentT('score')}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-3xl font-bold text-destructive">{summary.total_deducted}</div>
            <div className="text-xs text-muted-foreground">{studentT('deducted')}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-3xl font-bold text-green-600">+{summary.total_added}</div>
            <div className="text-xs text-muted-foreground">{studentT('added')}</div>
          </div>
        </div>
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
                    <TableCell>{t.score_categories?.name || commonT('notAvailable')}</TableCell>
                    <TableCell>
                      <span className={t.points > 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.note || commonT('notAvailable')}</TableCell>
                    <TableCell className="text-xs">{t.profiles?.full_name || commonT('notAvailable')}</TableCell>
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
