'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { useTranslations } from 'next-intl';

export default function TeacherPositionsPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const teacherT = useTranslations('teacher');
  const [positions, setPositions] = useState<TeacherPositionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeacherPositionItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TeacherPositionItem | null>(null);
  const [formData, setFormData] = useState({ name: '', sort_order: 1, is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getTeacherPositions({ includeInactive: true });
    if (result.success && result.data) {
      setPositions(result.data);
    } else {
      toast(settingsT('loadTeacherPositionsFailed'), { description: !result.success ? result.error.message : undefined });
    }
    setLoading(false);
  }, [settingsT]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

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
      toast(settingsT('teacherPositionRequired'));
      return;
    }

    setSaving(true);
    try {
      const result = editing
        ? await updateTeacherPosition(editing.id, formData)
        : await addTeacherPosition({ name: formData.name, sort_order: formData.sort_order });

      if (result.success) {
        toast(editing ? settingsT('teacherPositionEditSuccess') : settingsT('teacherPositionAddSuccess'));
        setShowForm(false);
        await load();
      } else {
        toast(settingsT('saveFailed'), { description: result.error.message });
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
        toast(data?.deactivated ? settingsT('teacherPositionDeactivated') : settingsT('teacherPositionDeleteSuccess'), {
          description: data?.deactivated ? settingsT('teacherPositionDeactivatedDescription', { count: data.used_count || 0 }) : undefined,
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
          <h1 className="text-2xl font-bold">{settingsT('manageTeacherPositionsTitle')}</h1>
          <p className="text-muted-foreground mt-1">{settingsT('manageTeacherPositionsDescription')}</p>
        </div>
        <Button onClick={openAddForm}>
          <Plus className="mr-2 h-4 w-4" />{settingsT('addTeacherPosition')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{settingsT('sortOrder')}</TableHead>
                <TableHead>{teacherT('position')}</TableHead>
                <TableHead>{settingsT('status')}</TableHead>
                <TableHead className="w-[120px]">{studentT('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {settingsT('noTeacherPositions')}
                  </TableCell>
                </TableRow>
              ) : positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="text-center text-muted-foreground">{position.sort_order}</TableCell>
                  <TableCell className="font-medium">{position.name}</TableCell>
                  <TableCell>
                    {position.is_active ? <Badge>{commonT('active')}</Badge> : <Badge variant="outline">{commonT('inactive')}</Badge>}
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
            <DialogTitle>{editing ? settingsT('editTeacherPosition') : settingsT('addTeacherPositionTitle')}</DialogTitle>
            <DialogDescription>{settingsT('teacherPositionDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">{settingsT('teacherPositionName')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={settingsT('teacherPositionPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">{settingsT('sortOrder')}</Label>
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
              {settingsT('deleteTeacherPositionDescription', { name: deleteConfirm?.name || '' })}
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
