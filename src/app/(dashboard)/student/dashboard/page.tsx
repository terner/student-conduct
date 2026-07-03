'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { History, AlertCircle, TrendingDown, TrendingUp, Minus, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { StudentDetail } from '@/components/features/students/student-detail';
import { getStudentDashboard } from '@/lib/actions/student.action';
import { checkMustChangePassword, checkPDPAConsent } from '@/lib/actions/dashboard.action';
import { useTranslations } from 'next-intl';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDateShort(value: string) {
  return new Date(value).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
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
        router.replace('/first-password');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-10" />
          <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  const hasScores = transactions.length > 0;
  const recentPoints = transactions.slice(0, 3).map((t: any) => t.points);

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 rounded-xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent p-5">
        <h1 className="text-2xl font-bold tracking-tight">{studentT('myScoreTitle')}</h1>
        <p className="text-sm text-muted-foreground">{studentT('myScoreDescription')}</p>
      </div>

      {/* Student profile + score cards (reused from detail page) */}
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

      {/* Score history */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-muted-foreground" />
            {studentT('scoreHistory')}
            {hasScores && (
              <Badge variant="secondary" className="ml-2 font-normal tabular-nums">
                {transactions.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {!hasScores ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{studentT('noScoreHistory')}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[140px]">{scoreT('date')}</TableHead>
                    <TableHead>{scoreT('type')}</TableHead>
                    <TableHead className="w-[100px] text-right">{scoreT('points')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{studentT('note')}</TableHead>
                    <TableHead className="hidden md:table-cell w-[140px]">{scoreT('recordedBy')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t: any, i: number) => (
                    <TableRow key={i} className="transition-colors hover:bg-muted/40">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{formatDateShort(t.recorded_at)}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(t.recorded_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{t.category_name || commonT('notAvailable')}</span>
                          {t.category_type && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${t.category_type === 'positive' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}`}>
                              {t.category_type === 'positive' ? studentT('added') : studentT('deducted')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums ${
                            t.points > 0 ? 'text-green-600' : t.points < 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          {t.points > 0 ? <TrendingUp className="size-3.5" /> : t.points < 0 ? <TrendingDown className="size-3.5" /> : <Minus className="size-3.5" />}
                          {t.points > 0 ? `+${t.points}` : t.points}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]">
                            {t.note || '—'}
                          </span>
                          {t.evidence?.length > 0 && (
                            <div className="flex gap-1 shrink-0">
                              {t.evidence.map((e: any) => (
                                <a key={e.id} href={e.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                  <img src={e.file_url} alt={e.file_name || 'หลักฐาน'} className="size-8 rounded border object-cover hover:ring-2 hover:ring-primary transition-all" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{t.recorded_by_name || '—'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
