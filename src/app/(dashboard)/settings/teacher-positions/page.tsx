'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  addTeacherPosition,
  deleteTeacherPosition,
  getTeacherPositions,
  type TeacherPositionItem,
  updateTeacherPosition,
} from '@/lib/actions/teacher-position.action';

export default function TeacherPositionsPage() {
  const [positions, setPositions] = useState<TeacherPositionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeacherPositionItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TeacherPositionItem | null>(null);
  const [formData, setFormData] = useState({ name: '', sort_order: 1, is_active: true });

  async function load() {
    setLoading(true);
    const result = await getTeacherPositions({ includeInactive: true });
    if (result.success && result.data) {
      setPositions(result.data);
    } else {
      toast('โหลดตำแหน่งครูไม่สำเร็จ', { description: !result.success ? result.error.message : undefined });
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAddForm() {
    setEditing(null);
    setFormData({ name: '', sort_order: positions.length + 1, is_active: true });
    setShowForm(true);
  }

  function openEditForm(position: TeacherPositionItem) {
    setEditing(position);
    setFormData({
      name: position.name,
      sort_order: position.sort_order,
      is_active: position.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast('กรุณากรอกชื่อตำแหน่ง');
      return;
    }

    setSaving(true);
    try {
      const result = editing
        ? await updateTeacherPosition(editing.id, formData)
        : await addTeacherPosition({ name: formData.name, sort_order: formData.sort_order });

      if (result.success) {
        toast(editing ? 'แก้ไขตำแหน่งครูสำเร็จ' : 'เพิ่มตำแหน่งครูสำเร็จ');
        setShowForm(false);
        await load();
      } else {
        toast('บันทึกไม่สำเร็จ', { description: result.error.message });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(position: TeacherPositionItem) {
    setSaving(true);
    try {
      const result = await deleteTeacherPosition(position.id);
      if (result.success) {
        const data = result.data as { deactivated?: boolean; used_count?: number } | null;
        toast(data?.deactivated ? 'ปิดใช้งานตำแหน่งแล้ว' : 'ลบตำแหน่งครูสำเร็จ', {
          description: data?.deactivated ? `มีครู ${data.used_count} คนใช้ตำแหน่งนี้อยู่ จึงปิดใช้งานแทนการลบ` : undefined,
        });
        setDeleteConfirm(null);
        await load();
      } else {
        toast('ลบไม่สำเร็จ', { description: result.error.message });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner className="size-8" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">กำหนดตำแหน่งครู</h1>
          <p className="text-muted-foreground mt-1">จัดการรายการตำแหน่งที่ใช้ในฟอร์มรายชื่อครูผู้สอน</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />เพิ่มตำแหน่ง
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ลำดับ</TableHead>
                <TableHead>ตำแหน่ง</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="w-[120px]">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    ยังไม่มีตำแหน่งครู
                  </TableCell>
                </TableRow>
              ) : positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="text-center text-muted-foreground">{position.sort_order}</TableCell>
                  <TableCell className="font-medium">{position.name}</TableCell>
                  <TableCell>
                    {position.is_active ? <Badge>ใช้งาน</Badge> : <Badge variant="outline">ปิดใช้งาน</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(position)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(position)}>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'แก้ไขตำแหน่งครู' : 'เพิ่มตำแหน่งครู'}</DialogTitle>
            <DialogDescription>ตำแหน่งนี้จะแสดงเป็นตัวเลือกในหน้ารายชื่อครูผู้สอน</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อตำแหน่ง *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น ครู, หัวหน้าระดับ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">ลำดับการเรียง</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                className="w-28"
              />
            </div>
            {editing && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="is_active">เปิดใช้งาน</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : <><Save className="mr-2 h-4 w-4" />บันทึก</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>
              ต้องการลบตำแหน่ง <strong>{deleteConfirm?.name}</strong> ใช่หรือไม่?
              หากมีครูใช้อยู่ ระบบจะปิดใช้งานตำแหน่งนี้แทน
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
              {saving ? 'กำลังลบ...' : 'ยืนยัน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
