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
import { useTranslations } from 'next-intl';

interface StageItem {
  id: string;
  code: string;
  name_th: string;
}

export default function GradeLevelsPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const classroomT = useTranslations('classroom');
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
      toast(settingsT('fillRequiredFields'));
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
        toast(editing ? settingsT('gradeLevelEditSuccess') : settingsT('gradeLevelAddSuccess'));
        setShowForm(false);
        await load();
      } else {
        toast(settingsT('saveFailed'), { description: result.error.message });
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
        toast(data?.deactivated ? settingsT('gradeLevelDeactivated') : settingsT('gradeLevelDeleteSuccess'), {
          description: data?.deactivated ? settingsT('gradeLevelDeactivatedDescription', { count: data.used_count || 0 }) : undefined,
        });
        setDeleteConfirm(null);
        await load();
      } else {
        toast(settingsT('deleteFailed'), { description: result.error.message });
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
          <h1 className="text-2xl font-bold">{settingsT('manageGradeLevelsTitle')}</h1>
          <p className="text-muted-foreground mt-1">{settingsT('manageGradeLevelsDescription')}</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />{settingsT('addGradeLevel')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{classroomT('stage')}</TableHead>
                <TableHead>{studentT('gradeLevel')}</TableHead>
                <TableHead>{settingsT('code')}</TableHead>
                <TableHead className="w-[100px]">{settingsT('levelNumber')}</TableHead>
                <TableHead className="w-[100px]">{settingsT('sortOrder')}</TableHead>
                <TableHead className="w-[120px]">{settingsT('status')}</TableHead>
                <TableHead className="w-[120px]">{studentT('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">{settingsT('noGradeLevels')}</TableCell>
                </TableRow>
              ) : levels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell>{level.education_stage_name || '-'}</TableCell>
                  <TableCell className="font-medium">{level.name}</TableCell>
                  <TableCell className="font-mono text-xs">{level.code}</TableCell>
                  <TableCell>{level.level_no}</TableCell>
                  <TableCell>{level.sort_order}</TableCell>
                  <TableCell>
                    {level.is_active ? <Badge>{commonT('active')}</Badge> : <Badge variant="outline">{commonT('inactive')}</Badge>}
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
            <DialogTitle>{editing ? settingsT('editGradeLevel') : settingsT('addGradeLevel')}</DialogTitle>
            <DialogDescription>{settingsT('gradeLevelDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{classroomT('stage')} {commonT('requiredMark')}</Label>
              <Select
                value={formData.education_stage_id}
                onValueChange={(v) => v && setFormData({ ...formData, education_stage_id: v })}
                disabled={!!editing}
                itemToStringLabel={(value) => stages.find(s => s.id === value)?.name_th || String(value)}
              >
                <SelectTrigger><SelectValue placeholder={settingsT('selectEducationStage')} /></SelectTrigger>
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
                <Label htmlFor="name">{settingsT('gradeLevelName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={settingsT('gradeLevelNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">{settingsT('code')} {commonT('requiredMark')}</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder={settingsT('gradeLevelCodePlaceholder')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="level_no">{settingsT('levelNumber')}</Label>
                <Input
                  id="level_no"
                  type="number"
                  value={formData.level_no}
                  onChange={(e) => setFormData({ ...formData, level_no: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">{settingsT('sortOrder')}</Label>
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
                <Label htmlFor="is_active">{commonT('active')}</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>{commonT('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? commonT('saving') : <><Save className="mr-2 h-4 w-4" />{commonT('save')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{settingsT('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {settingsT('deleteGradeLevelDescription', { name: deleteConfirm?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{commonT('cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
              {saving ? settingsT('deleting') : commonT('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
