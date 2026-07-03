'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Users, GraduationCap, BookOpen, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getDashboard, checkPDPAConsent, checkMustChangePassword } from '@/lib/actions/dashboard.action';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { createClient } from '@/lib/supabase/client';

interface DashboardStats {
  total_students: number;
  active_students: number;
  total_classrooms: number;
  total_teachers: number;
  average_score: number;
  at_risk_count: number;
  academic_year_name?: string | null;
  score_distribution?: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

interface DashboardTransaction {
  id: string;
  student_name?: string | null;
  student_id_number: string;
  category_name: string;
  points: number;
  created_at?: string | null;
  recorded_at?: string | null;
}

interface AtRiskStudent {
  student_id: string;
  first_name?: string | null;
  last_name?: string | null;
  student_id_number: string;
  classroom_name?: string | null;
  current_score: number;
  threshold_action?: string | null;
}

interface AcademicYearEnding {
  name: string;
  days_remaining: number;
  end_date: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const common = useTranslations('common');
  const locale = useLocale();
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTx, setRecentTx] = useState<DashboardTransaction[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [academicYearEnding, setAcademicYearEnding] = useState<AcademicYearEnding | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeRefreshRef = useRef<number | null>(null);

  const loadDashboard = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    const res = await getDashboard({ academic_year_id: selectedAcademicYearId || undefined });
    if (res.success) {
      setStats(res.data.stats as DashboardStats);
      setRecentTx((res.data.recentTransactions || []) as unknown as DashboardTransaction[]);
      setAtRisk(((res.data.atRiskStudents || []) as unknown as AtRiskStudent[]).slice(0, 5));
      setAcademicYearEnding((res.data.academicYearEnding || null) as AcademicYearEnding | null);
    }
    setLoading(false);
  }, [selectedAcademicYearId]);

  function formatDateTime(value?: string) {
    if (!value) return '';
    return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Check must_change_password first
      const passwordRes = await checkMustChangePassword();
      if (passwordRes.success && passwordRes.data?.must_change_password) {
        router.replace('/first-password');
        return;
      }

      // Check PDPA consent
      const consentRes = await checkPDPAConsent();
      if (consentRes.success && consentRes.data && !consentRes.data.consented) {
        router.replace('/pdpa-consent');
        return;
      }

      await loadDashboard();
    }
    load();
  }, [loadDashboard, router, selectedAcademicYearId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadDashboard();
    }, 30_000);
    const handleFocus = () => loadDashboard();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadDashboard();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (realtimeRefreshRef.current) window.clearTimeout(realtimeRefreshRef.current);
      realtimeRefreshRef.current = window.setTimeout(() => {
        loadDashboard();
      }, 750);
    };
    const channel = supabase
      .channel(`dashboard-score-transactions:${selectedAcademicYearId || 'current'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_transactions' },
        (payload) => {
          const newRow = payload.new as { academic_year_id?: string; status?: string } | null;
          const oldRow = payload.old as { academic_year_id?: string; status?: string } | null;
          const row = newRow || oldRow;
          const affectsApprovedScore = newRow?.status === 'approved' || oldRow?.status === 'approved';
          if (affectsApprovedScore && (!selectedAcademicYearId || !row?.academic_year_id || row.academic_year_id === selectedAcademicYearId)) {
            scheduleRefresh();
          }
        },
      )
      .subscribe();

    return () => {
      if (realtimeRefreshRef.current) window.clearTimeout(realtimeRefreshRef.current);
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard, selectedAcademicYearId]);

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{common('loading')}</p></div></div>;

  const statCards = [
    { title: t('totalStudents'), value: stats?.total_students || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
    { title: t('activeStudents'), value: stats?.active_students || 0, icon: Users, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
    { title: t('classrooms'), value: stats?.total_classrooms || 0, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900' },
    { title: t('teachers'), value: stats?.total_teachers || 0, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' },
    { title: t('averageScore'), value: stats?.average_score || 0, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900' },
    { title: t('atRiskCount'), value: stats?.at_risk_count || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' },
  ];

  const dist = stats?.score_distribution || { excellent: 0, good: 0, fair: 0, poor: 0 };
  const total = dist.excellent + dist.good + dist.fair + dist.poor;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('description')}
          {stats?.academic_year_name ? ` · ${t('academicYearSuffix', { year: stats.academic_year_name })}` : ''}
        </p>
      </div>

      {academicYearEnding && (
        <div className={`rounded-md border px-4 py-3 text-sm ${academicYearEnding.days_remaining <= 7 ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300' : 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300'}`}>
          <p className="font-medium">
            {academicYearEnding.days_remaining === 0
              ? `⚠️ วันนี้เป็นวันสุดท้ายของปีการศึกษา ${academicYearEnding.name}`
              : `⚠️ ปีการศึกษา ${academicYearEnding.name} จะสิ้นสุดในอีก ${academicYearEnding.days_remaining} วัน (${new Date(academicYearEnding.end_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })})`}
          </p>
          <p className="mt-1 opacity-80">กรุณาเตรียมตั้งปีการศึกษาใหม่ที่หน้า การตั้งค่า → ปีการศึกษา</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${s.bg}`}>
                    <Icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.title}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('scoreDistribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: t('excellentRange'), count: dist.excellent, color: 'bg-green-500' },
                { label: t('goodRange'), count: dist.good, color: 'bg-blue-500' },
                { label: t('fairRange'), count: dist.fair, color: 'bg-yellow-500' },
                { label: t('poorRange'), count: dist.poor, color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium">{t('peopleWithPercent', { count: item.count, percent: total > 0 ? Math.round(item.count / total * 100) : 0 })}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.color}`}
                      style={{ width: `${total > 0 ? (item.count / total * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {atRisk.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t('atRiskStudents')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('student')}</TableHead>
                    <TableHead>{t('classroom')}</TableHead>
                    <TableHead>{t('currentScore')}</TableHead>
                    <TableHead>{t('action')}</TableHead>
                    <TableHead className="w-[90px]">{t('viewInfo')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRisk.map((s) => (
                    <TableRow key={s.student_id}>
                      <TableCell>
                        <div className="font-medium">{s.first_name} {s.last_name}</div>
                        <div className="text-xs text-muted-foreground">{s.student_id_number}</div>
                      </TableCell>
                      <TableCell>{s.classroom_name || common('notAvailable')}</TableCell>
                      <TableCell><ScoreBadge score={s.current_score} /></TableCell>
                      <TableCell className="text-xs">{s.threshold_action || common('notAvailable')}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/students/${s.student_id}`} />}>
                          {t('view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {atRisk.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('atRiskStudents')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center py-4">{t('noAtRiskStudents')}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('recentTransactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noRecentTransactions')}</p>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    {tx.points > 0 ? (
                      <TrendingUp className="h-3 w-3 shrink-0 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium">{tx.student_name || tx.student_id_number}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {tx.student_id_number} · {tx.category_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(tx.created_at || tx.recorded_at || undefined)}
                      </div>
                    </div>
                  </div>
                  <span className={`shrink-0 font-mono text-xs font-medium ${tx.points > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {tx.points > 0 ? `+${tx.points}` : tx.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
