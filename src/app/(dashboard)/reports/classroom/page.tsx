'use client';

import { useState, useEffect } from 'react';
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

function getScoreLevel(score: number, baseScore = 100) {
  if (score >= baseScore) return 'ดีเยี่ยม';
  if (score >= baseScore - 20) return 'ดี';
  if (score >= baseScore - 40) return 'พอใช้';
  return 'ควรปรับปรุง';
}

export default function ClassroomReportPage() {
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [error, setError] = useState('');
  const [rankMode, setRankMode] = useState<'risk' | 'score'>('risk');

  useEffect(() => {
    async function loadClassrooms() {
      setLoadingClassrooms(true);
      const result = await getClassrooms({ academic_year_id: selectedAcademicYearId || undefined });
      if (result.success) {
        setClassrooms(result.data);
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
    exportCsv(reportData.students.map((student: any) => ({
      อันดับ: student.rank,
      รหัสนักเรียน: student.student_id_number,
      ชื่อ: student.full_name,
      หักคะแนน: student.total_deducted,
      ได้เพิ่ม: student.total_added,
      คะแนนปัจจุบัน: student.current_score,
      ระดับ: getScoreLevel(student.current_score, reportData.base_score),
      จำนวนหัก: student.deduct_count,
      จำนวนเพิ่ม: student.add_count,
    })), `classroom_report_${reportData.classroom.name}_${reportData.academic_year}`);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-6 space-y-6 print:p-0 print:text-black">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold">รายงานรายห้องเรียน</h1>
        <p className="text-muted-foreground mt-1">ดูคะแนนและระดับความประพฤติรายห้อง</p>
      </div>

      {loadingClassrooms ? (
        <div className="flex justify-center py-8"><Spinner className="size-6" /></div>
      ) : classrooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ยังไม่มีห้องเรียนที่ได้รับมอบหมาย
          </CardContent>
        </Card>
      ) : (
        <div className="grid max-w-xl gap-3 sm:grid-cols-2 print:hidden">
          <div className="space-y-1">
            <label className="text-sm font-medium">เลือกห้องเรียน</label>
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
              <SelectTrigger><SelectValue placeholder="เลือกห้องเรียน" /></SelectTrigger>
              <SelectContent>
                {classrooms.map(c => (
                  <SelectItem key={c.id} value={c.id} label={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">รูปแบบอันดับ</label>
            <Select
              value={rankMode}
              onValueChange={(value: 'risk' | 'score' | null) => {
                const next = value || 'risk';
                setRankMode(next);
                if (selectedId) loadReport(selectedId, next);
              }}
              itemToStringLabel={(value) => value === 'score' ? 'ดีเยี่ยม' : 'เฝ้าระวัง'}
            >
              <SelectTrigger><SelectValue placeholder="รูปแบบอันดับ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="risk" label="เฝ้าระวัง">เฝ้าระวัง</SelectItem>
                <SelectItem value="score" label="ดีเยี่ยม">ดีเยี่ยม</SelectItem>
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
                  {reportData.classroom.name} — ปีการศึกษา {reportData.academic_year}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {reportData.rank_mode === 'score'
                    ? 'อันดับดีเยี่ยม: คะแนนสูงสุดเป็นอันดับ 1'
                    : 'อันดับเฝ้าระวัง: คะแนนต่ำสุดเป็นอันดับ 1'}
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" onClick={handlePrint} disabled={!reportData.students?.length}>
                  <Printer className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={!reportData.students?.length}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-6 print:grid-cols-4 print:gap-2">
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold">{reportData.total_students}</div>
                  <div className="text-xs text-muted-foreground">นักเรียน</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold">{reportData.average_score}</div>
                  <div className="text-xs text-muted-foreground">คะแนนเฉลี่ย</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold text-green-600">{reportData.distribution.excellent}</div>
                  <div className="text-xs text-muted-foreground">ดีเยี่ยม</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center print:border print:bg-white print:p-2">
                  <div className="text-2xl font-bold text-red-600">{reportData.distribution.poor}</div>
                  <div className="text-xs text-muted-foreground">ควรปรับปรุง</div>
                </div>
              </div>

              <Table className="print:text-[11px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">อันดับ</TableHead>
                    <TableHead>รหัสนักเรียน</TableHead>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead>หักคะแนน</TableHead>
                    <TableHead>ได้เพิ่ม</TableHead>
                    <TableHead>คะแนนปัจจุบัน</TableHead>
                    <TableHead>ระดับ</TableHead>
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
