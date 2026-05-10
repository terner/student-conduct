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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getEducationStages } from '@/lib/actions/education-stage.action';
import {
  addGradeLevel,
  deleteGradeLevel,
  getGradeLevels,
  type GradeLevelItem,
  updateGradeLevel,
} from '@/lib/actions/grade-level.action';

interface StageItem {
  id: string;
  code: string;
  name_th: string;
}

export default function GradeLevelsPage() {
  const [stages, setStages] = useState<StageItem[]>([]);
  const [levels, setLevels] = useState<GradeLevelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GradeLevelItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<GradeLevelItem | null>(null);
  const [formData, setFormData] = useState({
    education_stage_id: '',
    code: '',
    name: '',
    level_no: 1,
    sort_order: 1,
    is_active: true,
  });

  async function load() {
    setLoading(true);
    const [stageRes, levelRes] = await Promise.all([
      getEducationStages(),
      getGradeLevels({ includeInactive: true }),
    ]);
    if (stageRes.success && stageRes.data) setStages(stageRes.data);
    if (levelRes.success && levelRes.data) setLevels(levelRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAddForm() {
    const firstStageId = stages[0]?.id || '';
    setEditing(null);
    setFormData({
      education_stage_id: firstStageId,
      code: '',
      name: '',
      level_no: 1,
      sort_order: levels.length + 1,
      is_active: true,
    });
    setShowForm(true);
  }

  function openEditForm(level: GradeLevelItem) {
    setEditing(level);
    setFormData({
      education_stage_id: level.education_stage_id,
      code: level.code,
      name: level.name,
      level_no: level.level_no,
      sort_order: level.sort_order,
      is_active: level.is_active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!formData.education_stage_id || !formData.code.trim() || !formData.name.trim()) {
      toast('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setSaving(true);
    try {
      const result = editing
        ? await updateGradeLevel(editing.id, {
          code: formData.code,
          name: formData.name,
          level_no: formData.level_no,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        : await addGradeLevel({
          education_stage_id: formData.education_stage_id,
          code: formData.code,
          name: formData.name,
          level_no: formData.level_no,
          sort_order: formData.sort_order,
        });

      if (result.success) {
        toast(editing ? 'แก้ไขชั้นปีสำเร็จ' : 'เพิ่มชั้นปีสำเร็จ');
        setShowForm(false);
        await load();
      } else {
        toast('บันทึกไม่สำเร็จ', { description: result.error.message });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(level: GradeLevelItem) {
    setSaving(true);
    try {
      const result = await deleteGradeLevel(level.id);
      if (result.success) {
        const data = result.data as { deactivated?: boolean; used_count?: number } | null;
        toast(data?.deactivated ? 'ปิดใช้งานชั้นปีแล้ว' : 'ลบชั้นปีสำเร็จ', {
          description: data?.deactivated ? `มีห้องเรียน ${data.used_count} ห้องใช้อยู่ จึงปิดใช้งานแทนการลบ` : undefined,
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
          <h1 className="text-2xl font-bold">จัดการชั้นปี</h1>
          <p className="text-muted-foreground mt-1">กำหนดชั้นปีภายใต้ระดับชั้น เช่น ประถมศึกษา: ป.1-ป.6</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />เพิ่มชั้นปี
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ระดับชั้น</TableHead>
                <TableHead>ชั้นปี</TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead className="w-[100px]">เลขชั้น</TableHead>
                <TableHead className="w-[100px]">ลำดับ</TableHead>
                <TableHead className="w-[120px]">สถานะ</TableHead>
                <TableHead className="w-[120px]">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">ยังไม่มีชั้นปี</TableCell>
                </TableRow>
              ) : levels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell>{level.education_stage_name || '-'}</TableCell>
                  <TableCell className="font-medium">{level.name}</TableCell>
                  <TableCell className="font-mono text-xs">{level.code}</TableCell>
                  <TableCell>{level.level_no}</TableCell>
                  <TableCell>{level.sort_order}</TableCell>
                  <TableCell>
                    {level.is_active ? <Badge>ใช้งาน</Badge> : <Badge variant="outline">ปิดใช้งาน</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(level)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirm(level)}>
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
            <DialogTitle>{editing ? 'แก้ไขชั้นปี' : 'เพิ่มชั้นปี'}</DialogTitle>
            <DialogDescription>ชั้นปีนี้จะใช้เป็นตัวเลือกในหน้าสร้างห้องเรียน</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>ระดับชั้น *</Label>
              <Select
                value={formData.education_stage_id}
                onValueChange={(v) => v && setFormData({ ...formData, education_stage_id: v })}
                disabled={!!editing}
                itemToStringLabel={(value) => stages.find(s => s.id === value)?.name_th || String(value)}
              >
                <SelectTrigger><SelectValue placeholder="เลือกระดับชั้น" /></SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id} label={stage.name_th}>
                      {stage.name_th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อชั้นปี *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="เช่น ป.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">รหัส *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="เช่น primary-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="level_no">เลขชั้น</Label>
                <Input
                  id="level_no"
                  type="number"
                  value={formData.level_no}
                  onChange={(e) => setFormData({ ...formData, level_no: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">ลำดับการเรียง</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                />
              </div>
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
              ต้องการลบชั้นปี <strong>{deleteConfirm?.name}</strong> ใช่หรือไม่?
              หากมีห้องเรียนใช้อยู่ ระบบจะปิดใช้งานแทน
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
