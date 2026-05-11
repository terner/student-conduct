'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getThresholdReport } from '@/lib/actions/report.action';
import { exportCsv } from '@/lib/utils/csv';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

export default function ThresholdReportPage() {
  const t = useTranslations('threshold');
  const reportT = useTranslations('report');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getThresholdReport(selectedAcademicYearId || undefined);
      if (result.success) setReportData(result.data);
      setLoading(false);
    }
    load();
  }, [selectedAcademicYearId]);

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div></div>;

  const students = reportData?.students || [];

  function handleExport() {
    const data = students.map((s: any) => ({
      [reportT('studentId')]: s.student_id_number,
      [reportT('studentName')]: `${s.first_name} ${s.last_name}`,
      [t('classroom')]: s.classroom_name,
      [reportT('currentScore')]: s.current_score,
      [t('deductedTotal')]: s.deducted_total,
      [reportT('level')]: s.threshold_level,
      [t('action')]: s.threshold_action,
    }));
    exportCsv(data, t('exportFileName', { year: reportData?.academic_year || 'unknown' }));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('description', { year: reportData?.academic_year || '-', count: students.length })}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={students.length === 0}>
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

      {students.length === 0 ? (
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
                {students.map((s: any) => (
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
