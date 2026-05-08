'use client';

import { useState } from 'react';
import { Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getIndividualReport } from '@/lib/actions/report.action';
import { exportCsv } from '@/lib/utils/csv';

export default function IndividualReportPage() {
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!searchId.trim()) return;
    setLoading(true);
    setError('');
    setReportData(null);

    const result = await getIndividualReport(searchId.trim());
    if (result.success && result.data) {
      setReportData(result.data);
    } else {
      setError('ไม่พบข้อมูลนักเรียน หรือยังไม่มีประวัติคะแนน');
    }
    setLoading(false);
  }

  function handleExport() {
    if (!reportData?.transactions) return;
    const data = reportData.transactions.map((t: any) => ({
      วันที่: new Date(t.recorded_at).toLocaleDateString('th-TH'),
      ประเภท: t.category_name,
      คะแนน: t.points,
      หมายเหตุ: t.note || '',
      'บันทึกโดย': t.recorded_by_name,
    }));
    exportCsv(data, `individual_report_${reportData.student.student_id_number}`);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">รายงานรายบุคคล</h1>
        <p className="text-muted-foreground mt-1">ดูประวัติคะแนนและข้อมูลรายบุคคล</p>
      </div>

      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="รหัสนักเรียน 10 หลัก..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading}>
          <Search className="mr-2 h-4 w-4" />ค้นหา
        </Button>
      </div>

      {loading && <div className="flex justify-center py-8"><Spinner className="size-6" /></div>}

      {error && (
        <Card><CardContent className="py-6 text-center text-muted-foreground">{error}</CardContent></Card>
      )}

      {reportData && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{reportData.student.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  รหัส: {reportData.student.student_id_number} · {reportData.student.classroom_name} · ปีการศึกษา {reportData.academic_year}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <ScoreBadge score={reportData.summary.current_score} baseScore={reportData.base_score} />
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{reportData.summary.current_score}</div>
                  <div className="text-xs text-muted-foreground">คะแนนปัจจุบัน</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold text-destructive">{reportData.summary.total_deducted}</div>
                  <div className="text-xs text-muted-foreground">ถูกหัก</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold text-green-600">+{reportData.summary.total_added}</div>
                  <div className="text-xs text-muted-foreground">ได้เพิ่ม</div>
                </div>
              </div>

              {reportData.transactions?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>คะแนน</TableHead>
                      <TableHead>หมายเหตุ</TableHead>
                      <TableHead>บันทึกโดย</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.transactions.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs">{new Date(t.recorded_at).toLocaleDateString('th-TH')}</TableCell>
                        <TableCell>{t.category_name}</TableCell>
                        <TableCell>
                          <span className={t.points > 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                            {t.points > 0 ? `+${t.points}` : t.points}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.note || '-'}</TableCell>
                        <TableCell className="text-xs">{t.recorded_by_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">ไม่มีประวัติการบันทึกคะแนน</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
