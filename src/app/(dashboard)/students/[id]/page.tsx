'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Edit3, ClipboardPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StudentDetail } from '@/components/features/students/student-detail';
import { StudentForm } from '@/components/features/students/student-form';
import { getStudent, editStudent } from '@/lib/actions/student.action';
import { getStudentSummary, getCategories, recordScore } from '@/lib/actions/score.action';
import { getIndividualReport } from '@/lib/actions/report.action';
import { toast } from 'sonner';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';
import type { StudentInput } from '@/lib/validation/schemas';
import type { ScoreCategory } from '@/types';

const STATUS_OPTIONS = [
  { value: 'active', label: 'กำลังศึกษา' },
  { value: 'inactive', label: 'ไม่ active' },
  { value: 'transferred', label: 'ย้ายออก' },
  { value: 'graduated', label: 'จบการศึกษา' },
  { value: 'suspended', label: 'พักการเรียน' },
];

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<StudentWithProfile | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [categories, setCategories] = useState<ScoreCategory[]>([]);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [recordCategory, setRecordCategory] = useState('');
  const [recordPoints, setRecordPoints] = useState(5);
  const [recordNote, setRecordNote] = useState('');
  const [recording, setRecording] = useState(false);

  const loadData = async () => {
    const id = params.id as string;
    const [studentRes, reportRes] = await Promise.all([
      getStudent(id),
      getIndividualReport(id),
    ]);

    if (studentRes.success && studentRes.data) {
      setStudent(studentRes.data as StudentWithProfile);
    } else {
      setError('ไม่พบข้อมูลนักเรียน');
    }

    if (reportRes.success && reportRes.data) {
      setReportData(reportRes.data);
    }
  };

  useEffect(() => {
    async function load() {
      await loadData();
      // Load categories for score recording
      const catRes = await getCategories();
      if (catRes.success && catRes.data) setCategories(catRes.data);
      setLoading(false);
    }
    load();
  }, [params.id]);

  const handleRecordScore = async () => {
    if (!student || !recordCategory || recordPoints <= 0) return;
    setRecording(true);
    try {
      const cat = categories.find(c => c.id === recordCategory);
      const points = cat?.type === 'deduct' ? -Math.abs(recordPoints) : Math.abs(recordPoints);
      const res = await recordScore({
        student_id: student.id,
        category_id: recordCategory,
        points,
        note: recordNote || undefined,
      });
      if (res.success) {
        toast('บันทึกคะแนนสำเร็จ');
        setShowRecordDialog(false);
        setRecordCategory('');
        setRecordPoints(5);
        setRecordNote('');
        await loadData();
      } else {
        toast('เกิดข้อผิดพลาด', { description: res.error?.message });
      }
    } catch {
      toast('เกิดข้อผิดพลาด');
    } finally {
      setRecording(false);
    }
  };

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus) return;
    if (!student || changingStatus) return;
    setChangingStatus(true);
    try {
      const result = await editStudent(student.id, { current_status: newStatus as any });
      if (result.success) {
        toast('เปลี่ยนสถานะสำเร็จ');
        await loadData();
      } else {
        toast('เกิดข้อผิดพลาด', { description: result.error?.message });
      }
    } catch {
      toast('เกิดข้อผิดพลาด', { description: 'ไม่สามารถเปลี่ยนสถานะได้' });
    } finally {
      setChangingStatus(false);
    }
  };

  const handleEditStudent = async (formData: StudentInput & { avatar_url?: string }) => {
    if (!student) return;
    const result = await editStudent(student.id, {
      prefix: formData.prefix,
      first_name: formData.first_name,
      last_name: formData.last_name,
      student_id_number: formData.student_id_number,
      classroom_id: formData.classroom_id,
      current_status: formData.current_status,
      class_number: formData.class_number,
      avatar_url: formData.avatar_url,
    });

    if (result.success) {
      setShowEditForm(false);
      toast('แก้ไขข้อมูลนักเรียนสำเร็จ');
      await loadData();
    } else {
      throw new Error(result.error?.message || 'เกิดข้อผิดพลาด');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error || 'ไม่พบข้อมูลนักเรียน'}</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/students')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{student.prefix}{student.first_name} {student.last_name}</h1>
            <p className="text-muted-foreground text-sm">รหัสนักเรียน: {student.student_id_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setRecordCategory(''); setRecordPoints(5); setRecordNote(''); setShowRecordDialog(true); }}>
            <ClipboardPlus className="mr-2 h-4 w-4" />
            บันทึกคะแนน
          </Button>
          <Button variant="outline" onClick={() => setShowEditForm(true)}>
            <Edit3 className="mr-2 h-4 w-4" />
            แก้ไขข้อมูล
          </Button>
        </div>
      </div>

      <StudentDetail student={student} scoreSummary={reportData?.summary} />

      {/* Status Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">จัดการสถานะ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select
              value={student.current_status}
              onValueChange={handleStatusChange}
              disabled={changingStatus}
              itemToStringLabel={(value) => {
                const opt = STATUS_OPTIONS.find(o => o.value === value);
                return opt ? opt.label : String(value);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {changingStatus ? 'กำลังเปลี่ยนสถานะ...' : 'เปลี่ยนสถานะนักเรียน'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Score History */}
      {reportData?.transactions && reportData.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ประวัติคะแนน</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableCell className="text-xs">
                      {new Date(t.recorded_at).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell>{t.category_name}</TableCell>
                    <TableCell>
                      <span className={t.points > 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {t.note || '-'}
                    </TableCell>
                    <TableCell className="text-xs">{t.recorded_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {(!reportData?.transactions || reportData.transactions.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            ยังไม่มีประวัติการบันทึกคะแนน
          </CardContent>
        </Card>
      )}

      {/* Record Score Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>บันทึกคะแนน</DialogTitle>
            <DialogDescription>
              {student?.prefix}{student?.first_name} {student?.last_name} ({student?.student_id_number})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-destructive">หักคะแนน</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.filter(c => c.type === 'deduct').map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setRecordCategory(c.id); setRecordPoints(Math.abs(c.default_points)); }}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-all ${
                      recordCategory === c.id
                        ? 'border-destructive bg-destructive/5 text-destructive font-medium'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <span className="flex-1 text-left truncate">{c.name}</span>
                    <span className="font-mono shrink-0">-{Math.abs(c.default_points)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-green-600">เพิ่มคะแนน</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.filter(c => c.type === 'add').map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setRecordCategory(c.id); setRecordPoints(Math.abs(c.default_points)); }}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-all ${
                      recordCategory === c.id
                        ? 'border-green-600 bg-green-50 text-green-700 font-medium'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <span className="flex-1 text-left truncate">{c.name}</span>
                    <span className="font-mono shrink-0">+{Math.abs(c.default_points)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>คะแนน</Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={recordPoints}
                onChange={e => setRecordPoints(Number(e.target.value))}
                className="w-24"
              />
            </div>

            <div className="space-y-1">
              <Label>หมายเหตุ</Label>
              <Textarea
                value={recordNote}
                onChange={e => setRecordNote(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRecordDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleRecordScore} disabled={!recordCategory || recordPoints <= 0 || recording}>
              {recording && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={(open) => !open && setShowEditForm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลนักเรียน</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลส่วนตัวของนักเรียน
            </DialogDescription>
          </DialogHeader>
          <StudentForm
            defaultValues={{
              prefix: (student.prefix as any) || 'เด็กชาย',
              first_name: student.first_name,
              last_name: student.last_name,
              student_id_number: student.student_id_number,
              classroom_id: student.classroom_id,
              class_number: (student as any).class_number || 1,
              current_status: student.current_status,
            }}
            onSubmit={handleEditStudent}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
