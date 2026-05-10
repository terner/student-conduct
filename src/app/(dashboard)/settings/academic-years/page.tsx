'use client';

import { useCallback, useState, useEffect } from 'react';
import { Plus, Check, Pencil, CopyPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  addAcademicYear,
  createNextAcademicYearFromCurrent,
  getAcademicYears,
  setCurrentAcademicYear,
  updateAcademicYear,
  type AcademicYearItem,
} from '@/lib/actions/academic-year.action';

const defaultForm = {
  name: '',
  start_date: '',
  end_date: '',
  base_score: 100,
};

export default function AcademicYearsPage() {
  const [years, setYears] = useState<AcademicYearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AcademicYearItem | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAcademicYears({ bypassCache: true });
    if (result.success && result.data) {
      setYears(result.data);
    } else if (!result.success) {
      toast('โหลดปีการศึกษาไม่สำเร็จ', { description: result.error.message });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  function openAddForm() {
    setEditing(null);
    setFormData(defaultForm);
    setShowForm(true);
  }

  function openEditForm(year: AcademicYearItem) {
    setEditing(year);
    setFormData({
      name: year.name,
      start_date: year.start_date || '',
      end_date: year.end_date || '',
      base_score: year.base_score || 100,
    });
    setShowForm(true);
  }

  async function saveYear() {
    if (!formData.name.trim()) {
      toast('กรุณากรอกปีการศึกษา');
      return;
    }

    setSaving(true);
    try {
      const result = editing
        ? await updateAcademicYear(editing.id, formData)
        : await addAcademicYear(formData);

      if (result.success) {
        toast(editing ? 'แก้ไขปีการศึกษาสำเร็จ' : 'เพิ่มปีการศึกษาสำเร็จ');
        setShowForm(false);
        await load();
      } else {
        toast('บันทึกไม่สำเร็จ', { description: result.error.message });
      }
    } finally {
      setSaving(false);
    }
  }

  async function setCurrent(id: string) {
    setSaving(true);
    try {
      const result = await setCurrentAcademicYear(id);
      if (result.success) {
        toast('ตั้งปีการศึกษาปัจจุบันสำเร็จ');
        await load();
      } else {
        toast('ตั้งปีการศึกษาปัจจุบันไม่สำเร็จ', { description: result.error.message });
      }
    } finally {
      setSaving(false);
    }
  }

  async function createNextYear() {
    setSaving(true);
    try {
      const result = await createNextAcademicYearFromCurrent();
      if (result.success) {
        toast(`สร้างปีการศึกษา ${result.data.academic_year_name} แล้ว`, {
          description: `ห้องเรียน ${result.data.created_classrooms} ห้อง, ครูประจำห้อง ${result.data.created_assignments} รายการ นักเรียนและคะแนนจะเริ่มว่าง`,
        });
        await load();
      } else {
        toast('สร้างปีถัดไปไม่สำเร็จ', { description: result.error.message });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="size-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">จัดการปีการศึกษา</h1>
          <p className="text-muted-foreground mt-1">เพิ่ม แก้ไข และเปลี่ยนปีการศึกษาปัจจุบัน</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={createNextYear} disabled={saving}>
            <CopyPlus className="h-4 w-4 mr-1" /> สร้างปีถัดไปจากปีปัจจุบัน
          </Button>
          <Button onClick={openAddForm}>
            <Plus className="h-4 w-4 mr-1" /> เพิ่มปีการศึกษา
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ปีการศึกษา</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>คะแนนตั้งต้น</TableHead>
                <TableHead>วันที่เริ่ม</TableHead>
                <TableHead>วันที่สิ้นสุด</TableHead>
                <TableHead className="w-[220px]">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">ยังไม่มีปีการศึกษา</TableCell></TableRow>
              ) : years.map((y) => (
                <TableRow key={y.id}>
                  <TableCell className="font-medium">{y.name}</TableCell>
                  <TableCell>
                    {y.is_current ? (
                      <Badge className="bg-green-500 text-white">ปัจจุบัน</Badge>
                    ) : (
                      <Badge variant="outline">ไม่ active</Badge>
                    )}
                  </TableCell>
                  <TableCell>{y.base_score || 100}</TableCell>
                  <TableCell className="text-xs">{y.start_date ? new Date(y.start_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                  <TableCell className="text-xs">{y.end_date ? new Date(y.end_date).toLocaleDateString('th-TH') : '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditForm(y)}>
                        <Pencil className="h-3 w-3 mr-1" /> แก้ไข
                      </Button>
                      {!y.is_current && (
                        <Button size="sm" variant="outline" onClick={() => setCurrent(y.id)} disabled={saving}>
                          <Check className="h-3 w-3 mr-1" /> ตั้งเป็นปัจจุบัน
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขปีการศึกษา' : 'เพิ่มปีการศึกษาใหม่'}</DialogTitle>
            <DialogDescription>ปีการศึกษานี้จะใช้กับห้องเรียน นักเรียน คะแนน และรายงาน</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="academic-year-name">ปีการศึกษา *</Label>
              <Input
                id="academic-year-name"
                placeholder="เช่น 2569"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">วันที่เริ่ม</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">วันที่สิ้นสุด</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="base-score">คะแนนตั้งต้น</Label>
              <Input
                id="base-score"
                type="number"
                min={0}
                value={formData.base_score}
                onChange={(e) => setFormData({ ...formData, base_score: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>ยกเลิก</Button>
            <Button onClick={saveYear} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
