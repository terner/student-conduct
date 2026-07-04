'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Users,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ClipboardPlus,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead, type SortDirection } from '@/components/ui/sortable-table-head';
import { compareNullableNumber, compareNullableText, textOrEmpty } from '@/components/ui/table-helpers';
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

type AtRiskSortField = 'student' | 'classroom' | 'current_score' | 'action';

function atRiskStudentName(student: AtRiskStudent) {
  return [student.first_name, student.last_name].filter(Boolean).join(' ');
}

export default function DashboardPage() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const locale = useLocale();
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTx, setRecentTx] = useState<DashboardTransaction[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [academicYearEnding, setAcademicYearEnding] = useState<AcademicYearEnding | null>(null);
  const [loading, setLoading] = useState(true);
  const [atRiskSortField, setAtRiskSortField] = useState<AtRiskSortField>('current_score');
  const [atRiskSortDirection, setAtRiskSortDirection] = useState<SortDirection>('asc');
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

  function handleAtRiskSort(field: AtRiskSortField) {
    if (atRiskSortField === field) {
      setAtRiskSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setAtRiskSortField(field);
    setAtRiskSortDirection(field === 'current_score' ? 'asc' : 'desc');
  }

  const sortedAtRisk = useMemo(() => {
    return [...atRisk].sort((a, b) => {
      let comparison = 0;
      switch (atRiskSortField) {
        case 'student':
          comparison = compareNullableText(atRiskStudentName(a), atRiskStudentName(b));
          break;
        case 'classroom':
          comparison = compareNullableText(a.classroom_name, b.classroom_name);
          break;
        case 'current_score':
          comparison = compareNullableNumber(a.current_score, b.current_score, 'asc');
          break;
        case 'action':
          comparison = compareNullableText(a.threshold_action, b.threshold_action);
          break;
      }
      return atRiskSortDirection === 'asc' ? comparison : -comparison;
    });
  }, [atRisk, atRiskSortDirection, atRiskSortField]);

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
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold sm:text-2xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t('description')}
          {stats?.academic_year_name ? ` · ${t('academicYearSuffix', { year: stats.academic_year_name })}` : ''}
        </p>
      </div>

      {academicYearEnding && (
        <div className={`rounded-md border px-4 py-3 text-sm ${academicYearEnding.days_remaining <= 7 ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300' : 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300'}`}>
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {academicYearEnding.days_remaining === 0
              ? t('academicYearEndingToday')
              : t('academicYearEndingInDays', {
                days: academicYearEnding.days_remaining,
                endDate: new Date(academicYearEnding.end_date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              })}
          </p>
          <p className="mt-1 opacity-80">{t('academicYearEndingTitle', { year: academicYearEnding.name })}</p>
          <p className="mt-1 opacity-80">{t('rolloverPreparationNote')}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title} size="sm" className="rounded-lg">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-md sm:size-10 ${s.bg}`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{s.title}</p>
                    <p className="text-lg font-bold leading-tight sm:text-xl">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 md:hidden">
        <Button variant="outline" size="lg" className="h-16 min-w-0 flex-col rounded-lg px-1 text-xs" nativeButton={false} render={<Link href="/score/record" />}>
          <ClipboardPlus className="size-4" />
          <span className="w-full truncate text-center">{nav('recordScore')}</span>
        </Button>
        <Button variant="outline" size="lg" className="h-16 min-w-0 flex-col rounded-lg px-1 text-xs" nativeButton={false} render={<Link href="/score/approval" />}>
          <CheckCircle2 className="size-4" />
          <span className="w-full truncate text-center">{nav('pendingApproval')}</span>
        </Button>
        <Button variant="outline" size="lg" className="h-16 min-w-0 flex-col rounded-lg px-1 text-xs" nativeButton={false} render={<Link href="/reports" />}>
          <FileText className="size-4" />
          <span className="w-full truncate text-center">{nav('reports')}</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-lg">
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
          <Card className="rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                {t('atRiskStudents')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead field="student" activeField={atRiskSortField} direction={atRiskSortDirection} onSort={handleAtRiskSort}>
                        {t('student')}
                      </SortableTableHead>
                      <SortableTableHead field="classroom" activeField={atRiskSortField} direction={atRiskSortDirection} onSort={handleAtRiskSort}>
                        {t('classroom')}
                      </SortableTableHead>
                      <SortableTableHead field="current_score" activeField={atRiskSortField} direction={atRiskSortDirection} onSort={handleAtRiskSort}>
                        {t('currentScore')}
                      </SortableTableHead>
                      <SortableTableHead field="action" activeField={atRiskSortField} direction={atRiskSortDirection} onSort={handleAtRiskSort}>
                        {t('action')}
                      </SortableTableHead>
                      <TableHead className="w-[90px]">{t('viewInfo')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAtRisk.map((s) => (
                      <TableRow key={s.student_id}>
                        <TableCell>
                          <div className="font-medium">{atRiskStudentName(s)}</div>
                          <div className="text-xs text-muted-foreground">{s.student_id_number}</div>
                        </TableCell>
                        <TableCell>{textOrEmpty(s.classroom_name)}</TableCell>
                        <TableCell><ScoreBadge score={s.current_score} /></TableCell>
                        <TableCell className="text-xs">{textOrEmpty(s.threshold_action)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/students?studentId=${s.student_id}`} />}>
                            {t('view')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="divide-y divide-border/70 md:hidden">
                {sortedAtRisk.map((s) => (
                  <div key={s.student_id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{textOrEmpty(atRiskStudentName(s))}</div>
                        <div className="text-xs text-muted-foreground">{s.student_id_number}</div>
                      </div>
                      <ScoreBadge score={s.current_score} className="shrink-0" />
                    </div>
                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between gap-3">
                        <span>{t('classroom')}</span>
                        <span className="truncate text-right text-foreground">{textOrEmpty(s.classroom_name)}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="shrink-0">{t('action')}</span>
                        <span className="text-right text-foreground">{textOrEmpty(s.threshold_action)}</span>
                      </div>
                    </div>
                    <Button className="mt-3 w-full rounded-lg" variant="outline" size="lg" nativeButton={false} render={<Link href={`/students?studentId=${s.student_id}`} />}>
                      {t('view')}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {atRisk.length === 0 && (
        <Card className="rounded-lg">
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

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t('recentTransactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noRecentTransactions')}</p>
          ) : (
            <div className="divide-y divide-border/70">
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0 sm:py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {tx.points > 0 ? (
                      <TrendingUp className="h-4 w-4 shrink-0 text-green-600 sm:h-3 sm:w-3" />
                    ) : (
                      <TrendingDown className="h-4 w-4 shrink-0 text-destructive sm:h-3 sm:w-3" />
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
                  <span className={`shrink-0 rounded-md px-2 py-1 font-mono text-xs font-medium ${tx.points > 0 ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-destructive dark:bg-red-950'}`}>
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
