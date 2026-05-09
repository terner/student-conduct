'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getClassrooms } from '@/lib/actions/classroom.action';
import { getClassroomReport } from '@/lib/actions/report.action';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';

export default function ClassroomReportPage() {
  const [classrooms, setClassrooms] = useState<ClassroomWithDetails[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getClassrooms().then(r => { if (r.success) setClassrooms(r.data); });
  }, []);

  async function handleView() {
    if (!selectedId) return;
    setLoading(true);
    const result = await getClassroomReport(selectedId);
    if (result.success) setReportData(result.data);
    setLoading(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">รายงานรายห้องเรียน</h1>
        <p className="text-muted-foreground mt-1">ดูคะแนนและระดับความประพฤติรายห้อง</p>
      </div>

      <div className="flex gap-2 items-end">
        <div className="w-64 space-y-1">
          <label className="text-sm font-medium">เลือกห้องเรียน</label>
          <Select value={selectedId} onValueChange={(v) => v && setSelectedId(v)}
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
        <Button onClick={handleView} disabled={!selectedId || loading}>ดูรายงาน</Button>
      </div>

      {loading && <div className="flex justify-center py-8"><Spinner className="size-6" /></div>}

      {reportData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {reportData.classroom.name} — ปีการศึกษา {reportData.academic_year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{reportData.total_students}</div>
                  <div className="text-xs text-muted-foreground">นักเรียน</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold">{reportData.average_score}</div>
                  <div className="text-xs text-muted-foreground">คะแนนเฉลี่ย</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold text-green-600">{reportData.distribution.excellent}</div>
                  <div className="text-xs text-muted-foreground">ดีเยี่ยม</div>
                </div>
                <div className="p-3 rounded-lg bg-muted text-center">
                  <div className="text-2xl font-bold text-red-600">{reportData.distribution.poor}</div>
                  <div className="text-xs text-muted-foreground">ควรปรับปรุง</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
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
                    <TableRow key={s.id}>
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
