'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Download, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { TablePaginationToolbar } from '@/components/ui/table-pagination-toolbar';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getThresholdReport, logReportExport, type ThresholdReportData } from '@/lib/actions/report.action';
import { exportCsv } from '@/lib/utils/csv';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { createClient } from '@/lib/supabase/client';
import type { StudentThresholdInfo } from '@/types';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function ThresholdReportPage() {
  const t = useTranslations('threshold');
  const reportT = useTranslations('report');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [reportData, setReportData] = useState<ThresholdReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [classroomFilter, setClassroomFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const realtimeRefreshRef = useRef<number | null>(null);

  const loadReport = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    const result = await getThresholdReport(selectedAcademicYearId || undefined);
    if (result.success) setReportData(result.data);
    if (showSpinner) setLoading(false);
  }, [selectedAcademicYearId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReport(true);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadReport]);

  useEffect(() => {
    const refresh = () => loadReport(false);
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [loadReport]);

  useEffect(() => {
    const supabase = createClient();
    const scheduleRefresh = () => {
      if (realtimeRefreshRef.current) window.clearTimeout(realtimeRefreshRef.current);
      realtimeRefreshRef.current = window.setTimeout(() => {
        loadReport(false);
      }, 750);
    };
    const channel = supabase
      .channel(`threshold-report:${selectedAcademicYearId || 'current'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_transactions' },
        (payload) => {
          const newRow = payload.new as { academic_year_id?: string; status?: string } | null;
          const oldRow = payload.old as { academic_year_id?: string; status?: string } | null;
          const row = newRow || oldRow || {};
          const affectsApprovedScore = newRow?.status === 'approved' || oldRow?.status === 'approved';
          if (affectsApprovedScore && (!selectedAcademicYearId || row.academic_year_id === selectedAcademicYearId)) {
            scheduleRefresh();
          }
        },
      )
      .subscribe();

    return () => {
      if (realtimeRefreshRef.current) window.clearTimeout(realtimeRefreshRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadReport, selectedAcademicYearId]);

  const students = useMemo(() => reportData?.students ?? [], [reportData]);
  const classrooms = useMemo(
    () => Array.from(new Set(students.map((student) => student.classroom_name).filter(Boolean))).sort(),
    [students],
  );
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((s: StudentThresholdInfo) => {
      const fullName = `${s.first_name ?? ''} ${s.last_name ?? ''}`.toLowerCase();
      const matchesSearch = !query
        || fullName.includes(query)
        || String(s.student_id_number ?? '').toLowerCase().includes(query)
        || String(s.classroom_name ?? '').toLowerCase().includes(query);
      const matchesLevel = levelFilter === 'all' || String(s.threshold_level) === levelFilter;
      const matchesClassroom = classroomFilter === 'all' || s.classroom_name === classroomFilter;
      return matchesSearch && matchesLevel && matchesClassroom;
    });
  }, [students, search, levelFilter, classroomFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = filteredStudents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = filteredStudents.length === 0 ? 0 : Math.min((currentPage - 1) * pageSize + pagedStudents.length, filteredStudents.length);

  useEffect(() => {
    if (page > totalPages) {
      void Promise.resolve().then(() => setPage(1));
    }
  }, [page, totalPages]);

  function resetPage() {
    setPage(1);
  }

  async function handleExport() {
    if (!reportData) return;
    const data = filteredStudents.map((s: StudentThresholdInfo) => ({
      [reportT('studentId')]: s.student_id_number,
      [reportT('studentName')]: `${s.first_name} ${s.last_name}`,
      [t('classroom')]: s.classroom_name,
      [reportT('currentScore')]: s.current_score,
      [t('deductedTotal')]: s.deducted_total,
      [reportT('level')]: s.threshold_level,
      [t('action')]: s.threshold_action,
    }));
    const filename = t('exportFileName', { year: reportData.academic_year.replace(/\s+/g, '_') });
    exportCsv(data, filename);
    await logReportExport('threshold', {
      academic_year: reportData.academic_year,
      exported_count: data.length,
      filters: { search, level: levelFilter, classroom: classroomFilter },
    });
  }

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          {reportData?.academic_year && (
            <p className="text-muted-foreground mt-1">
              {t('description', { year: reportData.academic_year, count: filteredStudents.length })}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filteredStudents.length === 0}>
          <Download className="mr-2 h-4 w-4" />{t('exportCsv')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder={t('searchPlaceholder')}
              className="pl-9"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(event) => {
              setLevelFilter(event.target.value);
              resetPage();
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            aria-label={t('levelFilter')}
          >
            <option value="all">{t('allLevels')}</option>
            {reportData?.thresholds?.map((threshold, index: number) => (
              <option key={index} value={String(index + 1)}>
                {t('levelLabel', { level: index + 1 })} {threshold.deducted}
              </option>
            ))}
          </select>
          <select
            value={classroomFilter}
            onChange={(event) => {
              setClassroomFilter(event.target.value);
              resetPage();
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            aria-label={t('classroomFilter')}
          >
            <option value="all">{t('allClassrooms')}</option>
            {classrooms.map((classroom) => (
              <option key={classroom} value={classroom}>{classroom}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('noStudents')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <TablePaginationToolbar
            page={page}
            pageSize={pageSize}
            total={filteredStudents.length}
            summary={t('paginationSummary', { start: from, end: to, total: filteredStudents.length })}
            rowsPerPageLabel={commonT('rowsPerPage')}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            onPageChange={setPage}
          />

          <Card>
            <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{reportT('studentId')}</TableHead>
                  <TableHead>{reportT('studentName')}</TableHead>
                  <TableHead>{t('classroom')}</TableHead>
                  <TableHead>{reportT('currentScore')}</TableHead>
                  <TableHead>{t('deductedTotal')}</TableHead>
                  <TableHead>{reportT('level')}</TableHead>
                  <TableHead>{t('action')}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStudents.map((s: StudentThresholdInfo) => (
                  <TableRow key={s.student_id}>
                    <TableCell className="font-mono text-xs">{s.student_id_number}</TableCell>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell>{s.classroom_name}</TableCell>
                    <TableCell><ScoreBadge score={s.current_score} /></TableCell>
                    <TableCell className="font-bold text-destructive">{s.deducted_total}</TableCell>
                    <TableCell>
                      <Badge variant={s.threshold_level >= 3 ? 'destructive' : 'outline'}>
                        {t('levelLabel', { level: s.threshold_level })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.threshold_action}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" nativeButton={false} render={<Link href={`/students?studentId=${s.student_id}`} />}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
