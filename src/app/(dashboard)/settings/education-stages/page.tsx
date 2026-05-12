'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getEducationStages, addEducationStage, updateEducationStage, deleteEducationStage } from '@/lib/actions/education-stage.action';
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
  name_en?: string;
  sort_order: number;
  is_active: boolean;
}

export default function EducationStagesPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const [stages, setStages] = useState<StageItem[]>([]);
  const [levels, setLevels] = useState<GradeLevelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showStageForm, setShowStageForm] = useState(false);
  const [editingStage, setEditingStage] = useState<StageItem | null>(null);
  const [stageFormData, setStageFormData] = useState({ code: '', name_th: '', name_en: '', sort_order: 1 });
  const [deleteStageConfirm, setDeleteStageConfirm] = useState<StageItem | null>(null);

  const [showLevelForm, setShowLevelForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<GradeLevelItem | null>(null);
  const [levelFormData, setLevelFormData] = useState({
    education_stage_id: '',
    code: '',
    name: '',
    level_no: 1,
    sort_order: 1,
    is_active: true,
  });
  const [deleteLevelConfirm, setDeleteLevelConfirm] = useState<GradeLevelItem | null>(null);

  const stageMap = useMemo(() => new Map(stages.map((stage) => [stage.id, stage])), [stages]);

  const getStageLabel = (stage: Pick<StageItem, 'code' | 'name_th'>) => {
    if (stage.code === 'secondary') return 'มัธยมต้น';
    if (stage.code === 'highschool') return 'มัธยมปลาย';
    return stage.name_th;
  };

  async function load() {
    setLoading(true);
    const [stageRes, levelRes] = await Promise.all([
      getEducationStages(),
      getGradeLevels({ includeInactive: true }),
    ]);

    if (stageRes.success && stageRes.data) setStages(stageRes.data as StageItem[]);
    if (levelRes.success && levelRes.data) setLevels(levelRes.data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  function openAddStageForm() {
    setEditingStage(null);
    setStageFormData({
      code: '',
      name_th: '',
      name_en: '',
      sort_order: stages.length + 1,
    });
    setShowStageForm(true);
  }

  function openEditStageForm(stage: StageItem) {
    setEditingStage(stage);
    setStageFormData({
      code: stage.code,
      name_th: stage.name_th,
      name_en: stage.name_en || '',
      sort_order: stage.sort_order,
    });
    setShowStageForm(true);
  }

  function openAddLevelForm(stage: StageItem) {
    const stageLevels = levels.filter((level) => level.education_stage_id === stage.id);
    setEditingLevel(null);
    setLevelFormData({
      education_stage_id: stage.id,
      code: '',
      name: '',
      level_no: stageLevels.length + 1,
      sort_order: stageLevels.length + 1,
      is_active: true,
    });
    setShowLevelForm(true);
  }

  function openEditLevelForm(level: GradeLevelItem) {
    setEditingLevel(level);
    setLevelFormData({
      education_stage_id: level.education_stage_id,
      code: level.code,
      name: level.name,
      level_no: level.level_no,
      sort_order: level.sort_order,
      is_active: level.is_active,
    });
    setShowLevelForm(true);
  }

  async function handleSaveStage() {
    if (!stageFormData.code.trim() || !stageFormData.name_th.trim()) {
      toast(settingsT('fillRequiredFields'));
      return;
    }

    setSaving(true);
    try {
      const result = editingStage
        ? await updateEducationStage(editingStage.id, {
          name_th: stageFormData.name_th,
          name_en: stageFormData.name_en || undefined,
          sort_order: stageFormData.sort_order,
        })
        : await addEducationStage({
          code: stageFormData.code,
          name_th: stageFormData.name_th,
          name_en: stageFormData.name_en || undefined,
          sort_order: stageFormData.sort_order,
        });

      if (result.success) {
        toast(editingStage ? settingsT('educationStageEditSuccess') : settingsT('educationStageAddSuccess'));
        setShowStageForm(false);
        await load();
      } else {
        toast(settingsT('genericError'), { description: result.error?.message });
      }
    } catch {
      toast(settingsT('genericError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStage(stage: StageItem) {
    setSaving(true);
    try {
      const result = await deleteEducationStage(stage.id);
      if (result.success) {
        toast(settingsT('educationStageDeleteSuccess'));
        setDeleteStageConfirm(null);
        await load();
      } else {
        toast(settingsT('educationStageDeleteFailed'), { description: result.error?.message });
        setDeleteStageConfirm(null);
      }
    } catch {
      toast(settingsT('genericError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLevel() {
    if (!levelFormData.education_stage_id || !levelFormData.code.trim() || !levelFormData.name.trim()) {
      toast(settingsT('fillRequiredFields'));
      return;
    }

    setSaving(true);
    try {
      const result = editingLevel
        ? await updateGradeLevel(editingLevel.id, {
          code: levelFormData.code,
          name: levelFormData.name,
          level_no: levelFormData.level_no,
          sort_order: levelFormData.sort_order,
          is_active: levelFormData.is_active,
        })
        : await addGradeLevel({
          education_stage_id: levelFormData.education_stage_id,
          code: levelFormData.code,
          name: levelFormData.name,
          level_no: levelFormData.level_no,
          sort_order: levelFormData.sort_order,
        });

      if (result.success) {
        toast(editingLevel ? settingsT('gradeLevelEditSuccess') : settingsT('gradeLevelAddSuccess'));
        setShowLevelForm(false);
        await load();
      } else {
        toast(settingsT('saveFailed'), { description: result.error?.message });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLevel(level: GradeLevelItem) {
    setSaving(true);
    try {
      const result = await deleteGradeLevel(level.id);
      if (result.success) {
        const data = result.data as { deactivated?: boolean; used_count?: number } | null;
        toast(data?.deactivated ? settingsT('gradeLevelDeactivated') : settingsT('gradeLevelDeleteSuccess'), {
          description: data?.deactivated ? settingsT('gradeLevelDeactivatedDescription', { count: data.used_count || 0 }) : undefined,
        });
        setDeleteLevelConfirm(null);
        await load();
      } else {
        toast(settingsT('deleteFailed'), { description: result.error?.message });
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
          <h1 className="text-2xl font-bold">{settingsT('manageEducationStructureTitle')}</h1>
          <p className="text-muted-foreground mt-1">{settingsT('manageEducationStructureDescription')}</p>
        </div>
        <Button onClick={openAddStageForm}>
          <Plus className="mr-2 h-4 w-4" />
          {settingsT('addEducationStage')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{settingsT('manageEducationStagesTitle')}</CardTitle>
          <CardDescription>{settingsT('manageEducationStagesDescription')}</CardDescription>
        </CardHeader>
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
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{settingsT('noEducationStages')}</TableCell>
                </TableRow>
              ) : stages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell className="text-center text-muted-foreground">{stage.sort_order}</TableCell>
                  <TableCell className="font-mono text-xs">{stage.code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{getStageLabel(stage)}</div>
                    {getStageLabel(stage) !== stage.name_th && (
                      <div className="text-xs text-muted-foreground">{stage.name_th}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{stage.name_en || '-'}</TableCell>
                  <TableCell>
                    {stage.is_active ? <Badge>{commonT('active')}</Badge> : <Badge variant="outline">{commonT('inactive')}</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditStageForm(stage)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteStageConfirm(stage)}>
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

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{settingsT('manageGradeLevelsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{settingsT('manageGradeLevelsDescription')}</p>
        </div>

        {stages.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {settingsT('noEducationStages')}
          </div>
        ) : stages.map((stage) => {
          const stageLevels = levels
            .filter((level) => level.education_stage_id === stage.id)
            .sort((a, b) => a.sort_order - b.sort_order || a.level_no - b.level_no);

          return (
            <section key={stage.id} className="rounded-md border">
              <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{getStageLabel(stage)}</h3>
                    <Badge variant="outline">{stageLevels.length}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{settingsT('gradeLevelsBelongToStage')}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => openAddLevelForm(stage)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {settingsT('addGradeLevel')}
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{settingsT('gradeLevelName')}</TableHead>
                    <TableHead>{settingsT('code')}</TableHead>
                    <TableHead className="w-[100px]">{settingsT('levelNumber')}</TableHead>
                    <TableHead className="w-[100px]">{settingsT('sortOrder')}</TableHead>
                    <TableHead className="w-[120px]">{settingsT('status')}</TableHead>
                    <TableHead className="w-[120px]">{studentT('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageLevels.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{settingsT('noGradeLevels')}</TableCell>
                    </TableRow>
                  ) : stageLevels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell className="font-mono text-xs">{level.code}</TableCell>
                      <TableCell>{level.level_no}</TableCell>
                      <TableCell>{level.sort_order}</TableCell>
                      <TableCell>
                        {level.is_active ? <Badge>{commonT('active')}</Badge> : <Badge variant="outline">{commonT('inactive')}</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditLevelForm(level)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteLevelConfirm(level)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          );
        })}
      </div>

      <Dialog open={showStageForm} onOpenChange={setShowStageForm}>
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
                value={stageFormData.code}
                onChange={(e) => setStageFormData({ ...stageFormData, code: e.target.value })}
                placeholder={settingsT('codePlaceholder')}
                disabled={!!editingStage}
              />
              <p className="text-xs text-muted-foreground">{settingsT('codeHelp')}</p>
            </div>
            <div className="space-y-2">
              <Label>{settingsT('nameTh')} {commonT('requiredMark')}</Label>
              <Input
                value={stageFormData.name_th}
                onChange={(e) => setStageFormData({ ...stageFormData, name_th: e.target.value })}
                placeholder={settingsT('nameThPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{settingsT('nameEn')}</Label>
              <Input
                value={stageFormData.name_en}
                onChange={(e) => setStageFormData({ ...stageFormData, name_en: e.target.value })}
                placeholder={settingsT('nameEnPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{settingsT('sortOrder')}</Label>
              <Input
                type="number"
                value={stageFormData.sort_order}
                onChange={(e) => setStageFormData({ ...stageFormData, sort_order: parseInt(e.target.value, 10) || 1 })}
                className="w-24"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowStageForm(false)}>{commonT('cancel')}</Button>
            <Button onClick={handleSaveStage} disabled={saving}>
              {saving ? commonT('saving') : <><Save className="mr-2 h-4 w-4" />{commonT('save')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLevelForm} onOpenChange={setShowLevelForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLevel ? settingsT('editGradeLevel') : settingsT('addGradeLevel')}</DialogTitle>
            <DialogDescription>{settingsT('gradeLevelDialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{settingsT('selectEducationStage')}</Label>
              <Input value={getStageLabel(stageMap.get(levelFormData.education_stage_id) || { code: '', name_th: '' })} disabled />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="grade-level-name">{settingsT('gradeLevelName')}</Label>
                <Input
                  id="grade-level-name"
                  value={levelFormData.name}
                  onChange={(e) => setLevelFormData({ ...levelFormData, name: e.target.value })}
                  placeholder={settingsT('gradeLevelNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade-level-code">{settingsT('code')} {commonT('requiredMark')}</Label>
                <Input
                  id="grade-level-code"
                  value={levelFormData.code}
                  onChange={(e) => setLevelFormData({ ...levelFormData, code: e.target.value })}
                  placeholder={settingsT('gradeLevelCodePlaceholder')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="level-number">{settingsT('levelNumber')}</Label>
                <Input
                  id="level-number"
                  type="number"
                  value={levelFormData.level_no}
                  onChange={(e) => setLevelFormData({ ...levelFormData, level_no: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort-order">{settingsT('sortOrder')}</Label>
                <Input
                  id="sort-order"
                  type="number"
                  value={levelFormData.sort_order}
                  onChange={(e) => setLevelFormData({ ...levelFormData, sort_order: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>
            {editingLevel && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="grade-level-active">{commonT('active')}</Label>
                <input
                  id="grade-level-active"
                  type="checkbox"
                  checked={levelFormData.is_active}
                  onChange={(e) => setLevelFormData({ ...levelFormData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowLevelForm(false)}>{commonT('cancel')}</Button>
            <Button onClick={handleSaveLevel} disabled={saving}>
              {saving ? commonT('saving') : <><Save className="mr-2 h-4 w-4" />{commonT('save')}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteStageConfirm} onOpenChange={(open) => !open && setDeleteStageConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{settingsT('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {settingsT('deleteEducationStageDescription', {
                name: deleteStageConfirm?.name_th || '',
                code: deleteStageConfirm?.code || '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteStageConfirm(null)}>{commonT('cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteStageConfirm && handleDeleteStage(deleteStageConfirm)} disabled={saving}>
              {saving ? settingsT('deleting') : settingsT('confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteLevelConfirm} onOpenChange={(open) => !open && setDeleteLevelConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{settingsT('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {settingsT('deleteGradeLevelDescription', { name: deleteLevelConfirm?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteLevelConfirm(null)}>{commonT('cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteLevelConfirm && handleDeleteLevel(deleteLevelConfirm)} disabled={saving}>
              {saving ? settingsT('deleting') : commonT('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
