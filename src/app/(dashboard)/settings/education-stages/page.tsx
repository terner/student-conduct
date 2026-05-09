'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getEducationStages, addEducationStage, updateEducationStage, deleteEducationStage } from '@/lib/actions/education-stage.action';

interface StageItem {
  id: string;
  code: string;
  name_th: string;
  name_en?: string;
  sort_order: number;
  is_active: boolean;
}

export default function EducationStagesPage() {
  const [stages, setStages] = useState<StageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStage, setEditingStage] = useState<StageItem | null>(null);
  const [formData, setFormData] = useState({ code: '', name_th: '', name_en: '', sort_order: 1 });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<StageItem | null>(null);

  async function load() {
    setLoading(true);
    const res = await getEducationStages();
    if (res.success && res.data) setStages(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAddForm() {
    setEditingStage(null);
    setFormData({ code: '', name_th: '', name_en: '', sort_order: stages.length + 1 });
    setShowForm(true);
  }

  function openEditForm(stage: StageItem) {
    setEditingStage(stage);
    setFormData({ code: stage.code, name_th: stage.name_th, name_en: stage.name_en || '', sort_order: stage.sort_order });
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.code.trim() || !formData.name_th.trim()) {
      toast('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    setSaving(true);
    try {
      if (editingStage) {
        const res = await updateEducationStage(editingStage.id, {
          name_th: formData.name_th,
          name_en: formData.name_en || undefined,
          sort_order: formData.sort_order,
        });
        if (res.success) {
          toast('แก้ไขระดับชั้นสำเร็จ');
          setShowForm(false);
          await load();
        } else {
          toast('เกิดข้อผิดพลาด', { description: res.error?.message });
        }
      } else {
        const res = await addEducationStage({
          code: formData.code,
          name_th: formData.name_th,
          name_en: formData.name_en || undefined,
          sort_order: formData.sort_order,
        });
        if (res.success) {
          toast('เพิ่มระดับชั้นสำเร็จ');
          setShowForm(false);
          await load();
        } else {
          toast('เกิดข้อผิดพลาด', { description: res.error?.message });
        }
      }
    } catch {
      toast('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(stage: StageItem) {
    setSaving(true);
    try {
      const res = await deleteEducationStage(stage.id);
      if (res.success) {
        toast('ลบระดับชั้นสำเร็จ');
        setDeleteConfirm(null);
        await load();
      } else {
        toast('ไม่สามารถลบได้', { description: res.error?.message });
        setDeleteConfirm(null);
      }
    } catch {
      toast('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="size-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการระดับชั้นการศึกษา</h1>
          <p className="text-muted-foreground mt-1">เพิ่ม แก้ไข และจัดการระดับชั้นการศึกษาที่ใช้ในระบบ</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />เพิ่มระดับชั้น
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ลำดับ</TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่อ (ไทย)</TableHead>
                <TableHead>ชื่อ (อังกฤษ)</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-[120px]">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">ยังไม่มีระดับชั้นการศึกษา</TableCell>
                </TableRow>
              ) : stages.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-center text-muted-foreground">{s.sort_order}</TableCell>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name_th}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.name_en || '-'}</TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <Badge className="bg-green-500 text-white">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(s)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStage ? 'แก้ไขระดับชั้น' : 'เพิ่มระดับชั้นใหม่'}</DialogTitle>
            <DialogDescription>
              {editingStage ? 'แก้ไขข้อมูลระดับชั้นการศึกษา' : 'เพิ่มระดับชั้นการศึกษาใหม่ที่ใช้ในระบบ'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>รหัส *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="เช่น primary, secondary"
                disabled={!!editingStage}
              />
              <p className="text-xs text-muted-foreground">รหัสภาษาอังกฤษ ไม่มีเว้นวรรค เปลี่ยนภายหลังไม่ได้</p>
            </div>
            <div className="space-y-2">
              <Label>ชื่อ (ภาษาไทย) *</Label>
              <Input
                value={formData.name_th}
                onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                placeholder="เช่น ประถมศึกษา"
              />
            </div>
            <div className="space-y-2">
              <Label>ชื่อ (ภาษาอังกฤษ)</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="เช่น Primary Education"
              />
            </div>
            <div className="space-y-2">
              <Label>ลำดับการเรียง</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                className="w-24"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : <><Save className="mr-2 h-4 w-4" />บันทึก</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              คุณต้องการลบระดับชั้น <strong>{deleteConfirm?.name_th}</strong> ({deleteConfirm?.code})?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
              {saving ? 'กำลังลบ...' : 'ยืนยันการลบ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
