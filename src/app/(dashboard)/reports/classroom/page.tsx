'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getClassrooms } from '@/lib/actions/classroom.action';
import { getClassroomReport } from '@/lib/actions/report.action';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';
import { exportCsv } from '@/lib/utils/csv';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

function getScoreLevel(score: number, labels: { excellent: string; good: string; fair: string; poor: string }, baseScore = 100) {
  if (score >= baseScore) return labels.excellent;
  if (score >= baseScore - 20) return labels.good;
  if (score >= baseScore - 40) return labels.fair;
  return labels.poor;
}

function scoreRangeLabels(baseScore: number, t: ReturnType<typeof useTranslations>) {
  return {
    excellent: t('scoreRangeAtLeast', { score: baseScore }),
    good: t('scoreRangeBetween', { min: baseScore - 20, max: baseScore - 1 }),
    fair: t('scoreRangeBetween', { min: baseScore - 40, max: baseScore - 21 }),
    poor: t('scoreRangeBelow', { score: baseScore - 40 }),
  };
}

export default function ClassroomReportPage() {
  const t = useTranslations('report');
  const levelT = useTranslations('level');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [error, setError] = useState('');
  const [rankMode, setRankMode] = useState<'risk' | 'score'>('risk');
  const selectedClassroom = useMemo(
    () => classrooms.find((classroom) => classroom.id === selectedId) || null,
    [classrooms, selectedId],
  );

  useEffect(() => {
    async function loadClassrooms() {
      setLoadingClassrooms(true);
      const result = await getClassrooms({ academic_year_id: selectedAcademicYearId || undefined });
      if (result.success) {
        setClassrooms(result.data);
        setReportData(null);
        setSelectedId('');
        if (result.data.length === 1) {
          setSelectedId(result.data[0].id);
          await loadReport(result.data[0].id);
        }
      } else {
        setError(result.error.message);
      }
      setLoadingClassrooms(false);
    }
    loadClassrooms();
  }, [selectedAcademicYearId]);

  async function loadReport(classroomId: string, mode = rankMode) {
    if (!classroomId) return;
    setLoading(true);
    setError('');
    const result = await getClassroomReport(classroomId, mode, selectedAcademicYearId || undefined);
    if (result.success) {
      setReportData(result.data);
    } else {
      setReportData(null);
      setError(result.error.message);
    }
    setLoading(false);
  }

  function handleExport() {
    if (!reportData?.students) return;
    const scoreLevelLabels = {
      excellent: levelT('excellent'),
      good: levelT('good'),
      fair: levelT('fair'),
      poor: levelT('poor'),
    };
    exportCsv(reportData.students.map((student: any) => ({
      [t('rank')]: student.rank,
      [t('studentId')]: student.student_id_number,
      [t('studentName')]: student.full_name,
      [t('deductedScore')]: student.total_deducted,
      [t('addedScore')]: student.total_added,
      [t('currentScore')]: student.current_score,
      [t('level')]: getScoreLevel(student.current_score, scoreLevelLabels, reportData.base_score),
      [t('deductCount')]: student.deduct_count,
      [t('addCount')]: student.add_count,
    })), `classroom_report_${reportData.classroom.name}_${reportData.academic_year}`);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-6 space-y-6 print:p-0 print:text-black">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">{t('classroomFull')}</h1>
        <p className="text-muted-foreground mt-1">{t('classroomReportDescription')}</p>
      </div>

      {loadingClassrooms ? (
        <div className="flex justify-center py-8"><Spinner className="size-6" /></div>
      ) : classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('assignedClassroomsEmpty')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid max-w-xl gap-3 sm:grid-cols-2 print:hidden">
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('selectClassroom')}</label>
            <Select value={selectedId || null} onValueChange={(v) => {
              if (!v) return;
              setSelectedId(v);
              loadReport(v);
            }}
              itemToStringLabel={(value) => {
                const c = classrooms.find(c => c.id === value);
                return c ? c.name : String(value);
              }}
            >
              <SelectTrigger className="min-w-0">
                <SelectValue placeholder={t('selectClassroom')}>
                  <span className="truncate">{selectedClassroom?.name}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {classrooms.map(c => (
                  <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">{t('rankMode')}</label>
            <Select
              value={rankMode}
              onValueChange={(value: 'risk' | 'score' | null) => {
                const next = value || 'risk';
                setRankMode(next);
                if (selectedId) loadReport(selectedId, next);
              }}
              itemToStringLabel={(value) => value === 'score' ? t('scoreRanking') : t('riskRanking')}
            >
              <SelectTrigger><SelectValue placeholder={t('rankMode')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="risk" label={t('riskRanking')}>{t('riskRanking')}</SelectItem>
                <SelectItem value="score" label={t('scoreRanking')}>{t('scoreRanking')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><Spinner className="size-6" /></div>}
      {error && <Card><CardContent className="py-6 text-center text-muted-foreground">{error}</CardContent></Card>}

      {reportData && (
        <>
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">
                  {t('classroomTitle', { classroom: reportData.classroom.name, year: reportData.academic_year })}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {reportData.rank_mode === 'score'
                    ? t('scoreRankingDescription')
                    : t('riskRankingDescription')}
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" onClick={handlePrint} disabled={!reportData.students?.length}>
                  <Printer className="mr-2 h-4 w-4" />
                  {t('pdf')}
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={!reportData.students?.length}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('csv')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-6 print:grid-cols-4 print:gap-2">
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold">{reportData.total_students}</div>
                  <div className="text-xs text-muted-foreground">{t('studentsCount')}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold">{reportData.average_score}</div>
                  <div className="text-xs text-muted-foreground">{t('averageScore')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold text-green-600">{reportData.distribution.excellent}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('scoreLevelCountLabel', {
                      level: t('excellent'),
                      range: scoreRangeLabels(reportData.base_score, t).excellent,
                    })}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold text-blue-600">{reportData.distribution.good}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('scoreLevelCountLabel', {
                      level: levelT('good'),
                      range: scoreRangeLabels(reportData.base_score, t).good,
                    })}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold text-amber-600">{reportData.distribution.fair}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('scoreLevelCountLabel', {
                      level: levelT('fair'),
                      range: scoreRangeLabels(reportData.base_score, t).fair,
                    })}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold text-red-600">{reportData.distribution.poor}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('scoreLevelCountLabel', {
                      level: t('poor'),
                      range: scoreRangeLabels(reportData.base_score, t).poor,
                    })}
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-lg border bg-muted/30 p-3 print:border print:bg-white">
                <div className="mb-2 text-sm font-medium">{t('scoreLevelLegend')}</div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                  <div>{t('scoreLevelLegendItem', { level: t('excellent'), range: scoreRangeLabels(reportData.base_score, t).excellent })}</div>
                  <div>{t('scoreLevelLegendItem', { level: levelT('good'), range: scoreRangeLabels(reportData.base_score, t).good })}</div>
                  <div>{t('scoreLevelLegendItem', { level: levelT('fair'), range: scoreRangeLabels(reportData.base_score, t).fair })}</div>
                  <div>{t('scoreLevelLegendItem', { level: t('poor'), range: scoreRangeLabels(reportData.base_score, t).poor })}</div>
                </div>
              </div>

              <Table className="print:text-[11px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">{t('rank')}</TableHead>
                    <TableHead>{t('studentId')}</TableHead>
                    <TableHead>{t('studentName')}</TableHead>
                    <TableHead>{t('deductedScore')}</TableHead>
                    <TableHead>{t('addedScore')}</TableHead>
                    <TableHead>{t('currentScore')}</TableHead>
                    <TableHead>{t('level')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.students?.map((s: any) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => window.location.href = `/students/${s.id}`}
                    >
                      <TableCell className="font-bold">#{s.rank}</TableCell>
                      <TableCell className="font-mono text-xs">{s.student_id_number}</TableCell>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-destructive">{s.total_deducted}</TableCell>
                      <TableCell className="text-green-600">+{s.total_added}</TableCell>
                      <TableCell className="font-bold">{s.current_score}</TableCell>
                      <TableCell><ScoreBadge score={s.current_score} baseScore={reportData.base_score} /></TableCell>
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
