'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getThresholdReport } from '@/lib/actions/report.action';
import { exportCsv } from '@/lib/utils/csv';

export default function ThresholdReportPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const result = await getThresholdReport();
      if (result.success) setReportData(result.data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div></div>;

  const students = reportData?.students || [];

  function handleExport() {
    const data = students.map((s: any) => ({
      รหัสนักเรียน: s.student_id_number,
      'ชื่อ-นามสกุล': `${s.first_name} ${s.last_name}`,
      ห้องเรียน: s.classroom_name,
      'คะแนนปัจจุบัน': s.current_score,
      'ถูกหักสะสม': s.deducted_total,
      'ระดับ': s.threshold_level,
      'การดำเนินการ': s.threshold_action,
    }));
    exportCsv(data, 'threshold_report');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายงานนักเรียนถึงเกณฑ์</h1>
          <p className="text-muted-foreground mt-1">
            ปีการศึกษา {reportData?.academic_year} · พบ {students.length} คน
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={students.length === 0}>
          <Download className="mr-2 h-4 w-4" />ส่งออก CSV
        </Button>
      </div>

      {reportData?.thresholds && (
        <div className="flex flex-wrap gap-2">
          {reportData.thresholds.map((t: any, i: number) => (
            <Badge key={i} variant="outline" className="text-sm" style={{ borderColor: t.color }}>
              ระดับ {i + 1}: หัก {t.deducted} คะแนนขึ้นไป — {t.action}
            </Badge>
          ))}
        </div>
      )}

      {students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">ไม่มีนักเรียนที่ถึงเกณฑ์แจ้งเตือน</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสนักเรียน</TableHead>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>ห้อง</TableHead>
                  <TableHead>คะแนนปัจจุบัน</TableHead>
                  <TableHead>หักสะสม</TableHead>
                  <TableHead>ระดับ</TableHead>
                  <TableHead>การดำเนินการ</TableHead>
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
                        ระดับ {s.threshold_level}
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

