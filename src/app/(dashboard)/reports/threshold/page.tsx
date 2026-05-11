'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getThresholdReport, logReportExport } from '@/lib/actions/report.action';
import { exportCsv } from '@/lib/utils/csv';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

const PAGE_SIZE = 25;

export default function ThresholdReportPage() {
  const t = useTranslations('threshold');
  const reportT = useTranslations('report');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [classroomFilter, setClassroomFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getThresholdReport(selectedAcademicYearId || undefined);
      if (result.success) setReportData(result.data);
      setLoading(false);
    }
    load();
  }, [selectedAcademicYearId]);

  const students = reportData?.students || [];
  const classrooms = Array.from(new Set(students.map((s: any) => s.classroom_name).filter(Boolean))).sort() as string[];
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((s: any) => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
      const matchesSearch = !query
        || fullName.includes(query)
        || String(s.student_id_number || '').toLowerCase().includes(query)
        || String(s.classroom_name || '').toLowerCase().includes(query);
      const matchesLevel = levelFilter === 'all' || String(s.threshold_level) === levelFilter;
      const matchesClassroom = classroomFilter === 'all' || s.classroom_name === classroomFilter;
      return matchesSearch && matchesLevel && matchesClassroom;
    });
  }, [students, search, levelFilter, classroomFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedStudents = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetPage() {
    setPage(1);
  }

  async function handleExport() {
    const data = filteredStudents.map((s: any) => ({
      [reportT('studentId')]: s.student_id_number,
      [reportT('studentName')]: `${s.first_name} ${s.last_name}`,
      [t('classroom')]: s.classroom_name,
      [reportT('currentScore')]: s.current_score,
      [t('deductedTotal')]: s.deducted_total,
      [reportT('level')]: s.threshold_level,
      [t('action')]: s.threshold_action,
    }));
    const filename = t('exportFileName', { year: String(reportData?.academic_year || 'unknown').replace(/\s+/g, '_') });
    exportCsv(data, filename);
    await logReportExport('threshold', {
      academic_year: reportData?.academic_year || '',
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
          <p className="text-muted-foreground mt-1">
            {t('description', { year: reportData?.academic_year || '-', count: filteredStudents.length })}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filteredStudents.length === 0}>
          <Download className="mr-2 h-4 w-4" />{t('exportCsv')}
        </Button>
      </div>

      {reportData?.thresholds && (
        <div className="flex flex-wrap gap-2">
          {reportData.thresholds.map((threshold: any, i: number) => (
            <Badge key={i} variant="outline" className="text-sm" style={{ borderColor: threshold.color }}>
              {t('thresholdRule', { level: i + 1, points: threshold.deducted, action: threshold.action })}
            </Badge>
          ))}
        </div>
      )}

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
            {reportData?.thresholds?.map((_: any, index: number) => (
              <option key={index} value={String(index + 1)}>
                {t('levelLabel', { level: index + 1 })}
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
                {pagedStudents.map((s: any) => (
                  <TableRow key={s.student_id} className={s.threshold_color ? '' : ''}>
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
                      <Button variant="ghost" size="icon" className="h-7 w-7" nativeButton={false} render={<Link href={`/students/${s.student_id}`} />}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t p-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <span>
                  {t('paginationSummary', {
                    start: (currentPage - 1) * PAGE_SIZE + 1,
                    end: Math.min(currentPage * PAGE_SIZE, filteredStudents.length),
                    total: filteredStudents.length,
                  })}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />{commonT('previous')}
                  </Button>
                  <span className="px-2">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                    {commonT('next')}<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
