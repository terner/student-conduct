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
import { useTranslations } from 'next-intl';

interface StageItem {
  id: string;
  code: string;
  name_th: string;
  name_en?: string;
  sort_order: number;
  is_active: boolean;
}

export default function EducationStagesPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
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
      toast(settingsT('fillRequiredFields'));
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
          toast(settingsT('educationStageEditSuccess'));
          setShowForm(false);
          await load();
        } else {
          toast(settingsT('genericError'), { description: res.error?.message });
        }
      } else {
        const res = await addEducationStage({
          code: formData.code,
          name_th: formData.name_th,
          name_en: formData.name_en || undefined,
          sort_order: formData.sort_order,
        });
        if (res.success) {
          toast(settingsT('educationStageAddSuccess'));
          setShowForm(false);
          await load();
        } else {
          toast(settingsT('genericError'), { description: res.error?.message });
        }
      }
    } catch {
      toast(settingsT('genericError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(stage: StageItem) {
    setSaving(true);
    try {
      const res = await deleteEducationStage(stage.id);
      if (res.success) {
        toast(settingsT('educationStageDeleteSuccess'));
        setDeleteConfirm(null);
        await load();
      } else {
        toast(settingsT('educationStageDeleteFailed'), { description: res.error?.message });
        setDeleteConfirm(null);
      }
    } catch {
      toast(settingsT('genericError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="size-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{settingsT('manageEducationStagesTitle')}</h1>
          <p className="text-muted-foreground mt-1">{settingsT('manageEducationStagesDescription')}</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />{settingsT('addEducationStage')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">{settingsT('sortOrder')}</TableHead>
                <TableHead>{settingsT('code')}</TableHead>
                <TableHead>{settingsT('nameTh')}</TableHead>
                <TableHead>{settingsT('nameEn')}</TableHead>
                <TableHead>{settingsT('status')}</TableHead>
                <TableHead className="w-[120px]">{studentT('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">{settingsT('noEducationStages')}</TableCell>
                </TableRow>
              ) : stages.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-center text-muted-foreground">{s.sort_order}</TableCell>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name_th}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.name_en || '-'}</TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <Badge className="bg-green-500 text-white">{commonT('active')}</Badge>
                    ) : (
                      <Badge variant="outline">{commonT('inactive')}</Badge>
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
            <DialogTitle>{editingStage ? settingsT('editEducationStage') : settingsT('addEducationStageNew')}</DialogTitle>
            <DialogDescription>
              {editingStage ? settingsT('editEducationStageDescription') : settingsT('addEducationStageDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{settingsT('code')} {commonT('requiredMark')}</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={settingsT('codePlaceholder')}
                disabled={!!editingStage}
              />
              <p className="text-xs text-muted-foreground">{settingsT('codeHelp')}</p>
            </div>
            <div className="space-y-2">
              <Label>{settingsT('nameTh')} {commonT('requiredMark')}</Label>
              <Input
                value={formData.name_th}
                onChange={(e) => setFormData({ ...formData, name_th: e.target.value })}
                placeholder={settingsT('nameThPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{settingsT('nameEn')}</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder={settingsT('nameEnPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{settingsT('sortOrder')}</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                className="w-24"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>{commonT('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? commonT('saving') : <><Save className="mr-2 h-4 w-4" />{commonT('save')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{settingsT('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {settingsT('deleteEducationStageDescription', {
                name: deleteConfirm?.name_th || '',
                code: deleteConfirm?.code || '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{commonT('cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={saving}>
              {saving ? settingsT('deleting') : settingsT('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
