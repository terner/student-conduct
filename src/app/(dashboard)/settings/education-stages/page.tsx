'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Plus, Pencil, Trash2, Save, ChevronRight, ChevronDown, Search, Hash, School, BookOpen, GraduationCap, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getEducationStages, addEducationStage, updateEducationStage, deleteEducationStage } from '@/lib/actions/education-stage.action';
import { addGradeLevel, deleteGradeLevel, getGradeLevels, type GradeLevelItem, updateGradeLevel } from '@/lib/actions/grade-level.action';
import { addClassroom, editClassroom, getClassrooms, removeClassroom } from '@/lib/actions/classroom.action';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { useTranslations } from 'next-intl';

// ─── Types ──────────────────────────────────────

interface StageItem { id: string; code: string; name_th: string; name_en?: string; sort_order: number; is_active: boolean; }
type LevelItem = GradeLevelItem;
type ClassroomItem = ClassroomWithDetails;

type TreeNodeType = 'stage' | 'grade_level' | 'classroom';

interface SelectedNode {
  type: TreeNodeType;
  id: string;
}

type StageFormData = { name_th: string; name_en: string };
type LevelFormData = { education_stage_id: string; name: string; is_active?: boolean };
type ClassroomFormData = { name: string; grade_level_id: string; education_stage_id: string; grade_level: number };
type OpenChangeHandler = Dispatch<SetStateAction<boolean>>;

// ─── Labels ────────────────────────────────────

function stageLabel(stage: Pick<StageItem, 'code' | 'name_th'>) {
  if (stage.code === 'secondary') return 'มัธยมต้น';
  if (stage.code === 'highschool') return 'มัธยมปลาย';
  return stage.name_th;
}

// ─── Page ──────────────────────────────────────

export default function EducationStagesPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const classroomT = useTranslations('classroom');
  const academicYearId = useSelectedAcademicYearId();

  // Data
  const [stages, setStages] = useState<StageItem[]>([]);
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tree state
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [search, setSearch] = useState('');

  // Form dialogs
  const [showStageForm, setShowStageForm] = useState(false);
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [showClassroomForm, setShowClassroomForm] = useState(false);
  const [editingStage, setEditingStage] = useState<StageItem | null>(null);
  const [editingLevel, setEditingLevel] = useState<LevelItem | null>(null);
  const [editingClassroom, setEditingClassroom] = useState<ClassroomItem | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SelectedNode | null>(null);

  // Load
  async function load() {
    setLoading(true);
    const [stageRes, levelRes, classRes] = await Promise.all([
      getEducationStages(),
      getGradeLevels({ includeInactive: true }),
      getClassrooms({ academic_year_id: academicYearId || undefined }),
    ]);
    if (stageRes.success && stageRes.data) setStages(stageRes.data as StageItem[]);
    if (levelRes.success && levelRes.data) setLevels(levelRes.data);
    if (classRes.success && classRes.data) setClassrooms(classRes.data as ClassroomItem[]);
    setLoading(false);
  }

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [academicYearId]);

  // Expand all on first load
  useEffect(() => {
    if (stages.length) {
      void Promise.resolve().then(() => setExpanded(new Set(stages.map(s => s.id))));
    }
  }, [stages.length]);

  // ─── Toggle ──────────────────────────────

  function toggle(id: string) {
    setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  // ─── Select ──────────────────────────────

  function selectNode(type: TreeNodeType, id: string) {
    setSelected({ type, id });
  }

  const selectedItem = useMemo(() => {
    if (!selected) return null;
    if (selected.type === 'stage') return stages.find(s => s.id === selected.id) || null;
    if (selected.type === 'grade_level') return levels.find(l => l.id === selected.id) || null;
    return classrooms.find(c => c.id === selected.id) || null;
  }, [selected, stages, levels, classrooms]);

  const selectedStageForLevel = useMemo(() => {
    if (!selectedItem || selected?.type !== 'grade_level') return null;
    return stages.find(s => s.id === (selectedItem as LevelItem).education_stage_id) || null;
  }, [selected, selectedItem, stages]);

  const selectedLevelForClassroom = useMemo(() => {
    if (!selectedItem || selected?.type !== 'classroom') return null;
    const cr = selectedItem as ClassroomItem;
    return levels.find(l => l.id === cr.grade_level_id) || null;
  }, [selected, selectedItem, levels]);

  // ─── Stage Form ──────────────────────────

  function openAddStage() { setEditingStage(null); setShowStageForm(true); }
  function openEditStage(s: StageItem) { setEditingStage(s); setShowStageForm(true); }

  async function handleSaveStage(data: { name_th: string; name_en: string }) {
    setSaving(true);
    try {
      const sortOrder = editingStage ? editingStage.sort_order : stages.length + 1;
      const code = editingStage ? editingStage.code : data.name_th.replace(/ศึกษา$/, '').toLowerCase();
      const res = editingStage
        ? await updateEducationStage(editingStage.id, { name_th: data.name_th, name_en: data.name_en || undefined, sort_order: sortOrder })
        : await addEducationStage({ code, ...data, sort_order: sortOrder });
      if (res.success) { toast(editingStage ? 'แก้ไขแล้ว' : 'เพิ่มแล้ว'); setShowStageForm(false); await load(); }
      else toast('ผิดพลาด', { description: res.error?.message });
    } finally { setSaving(false); }
  }

  // ─── Level Form ──────────────────────────

  function openAddLevel(stageId: string) { setEditingLevel(null); setShowLevelForm(true); setSelected({ type: 'stage', id: stageId }); }
  function openEditLevel(l: LevelItem) { setEditingLevel(l); setShowLevelForm(true); }

  async function handleSaveLevel(data: { education_stage_id: string; name: string; is_active?: boolean }) {
    setSaving(true);
    try {
      const stageLevels = levels.filter(l => l.education_stage_id === data.education_stage_id);
      const sortOrder = editingLevel ? editingLevel.sort_order : stageLevels.length + 1;
      const levelNo = editingLevel ? editingLevel.level_no : stageLevels.length + 1;
      const code = editingLevel ? editingLevel.code : data.name.toLowerCase().replace(/\s+/g, '');
      const payload = { ...data, code, sort_order: sortOrder, level_no: levelNo, is_active: data.is_active ?? true };
      const res = editingLevel
        ? await updateGradeLevel(editingLevel.id, payload)
        : await addGradeLevel(payload);
      if (res.success) { toast(editingLevel ? 'แก้ไขแล้ว' : 'เพิ่มแล้ว'); setShowLevelForm(false); await load(); }
      else toast('ผิดพลาด', { description: res.error?.message });
    } finally { setSaving(false); }
  }

  // ─── Classroom ──────────────────────────

  function openAddClassroom(gradeLevelId: string, educationStageId: string) {
    const level = levels.find(l => l.id === gradeLevelId);
    if (!level) return;
    // Auto-generate next classroom number
    const prefix = level.name;
    const existing = classrooms.filter(c => c.grade_level_id === gradeLevelId);
    let maxNum = 0;
    for (const cr of existing) {
      const match = cr.name.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(\\d+)$`));
      if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
    }
    const nextName = `${prefix}/${maxNum + 1}`;
    handleSaveClassroom({ name: nextName, grade_level_id: gradeLevelId, education_stage_id: educationStageId, grade_level: level.level_no });
  }

  function openEditClassroom(c: ClassroomItem) { setEditingClassroom(c); setShowClassroomForm(true); }

  async function handleSaveClassroom(data: { name: string; grade_level_id: string; education_stage_id: string; grade_level: number }) {
    setSaving(true);
    try {
      const res = editingClassroom
        ? await editClassroom(editingClassroom.id, data)
        : await addClassroom(data);
      if (res.success) {
        toast(editingClassroom ? 'แก้ไขแล้ว' : 'เพิ่มแล้ว');
        setShowClassroomForm(false);
        await load();
      } else toast('ผิดพลาด', { description: res.error?.message });
    } finally { setSaving(false); }
  }

  // ─── Delete ──────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      let res;
      if (deleteTarget.type === 'stage') res = await deleteEducationStage(deleteTarget.id);
      else if (deleteTarget.type === 'grade_level') res = await deleteGradeLevel(deleteTarget.id);
      else res = await removeClassroom(deleteTarget.id);
      if (res?.success) { toast('ลบแล้ว'); setDeleteTarget(null); setSelected(null); await load(); }
      else toast('ลบไม่สำเร็จ', { description: res?.error?.message });
    } finally { setSaving(false); }
  }

  function deleteLabel() {
    if (!deleteTarget) return '';
    if (deleteTarget.type === 'stage') return stages.find(s => s.id === deleteTarget.id)?.name_th || '';
    if (deleteTarget.type === 'grade_level') return levels.find(l => l.id === deleteTarget.id)?.name || '';
    return classrooms.find(c => c.id === deleteTarget.id)?.name || '';
  }

  // ─── Filter ──────────────────────────────

  const filteredStages = useMemo(() => {
    if (!search) return stages;
    const q = search.toLowerCase();
    return stages.filter(s => {
      const label = stageLabel(s).toLowerCase();
      if (label.includes(q)) return true;
      const stageLevels = levels.filter(l => l.education_stage_id === s.id);
      if (stageLevels.some(l => l.name.toLowerCase().includes(q))) return true;
      const stageClassrooms = classrooms.filter(c => stageLevels.some(l => l.id === c.grade_level_id));
      if (stageClassrooms.some(c => c.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [stages, levels, classrooms, search]);

  function filteredLevels(stageId: string) {
    return levels.filter(l => l.education_stage_id === stageId).sort((a, b) => a.sort_order - b.sort_order);
  }

  function filteredClassrooms(levelId: string) {
    return classrooms.filter(c => c.grade_level_id === levelId).sort((a, b) => a.name.localeCompare(b.name));
  }

  function levelCount(stageId: string) { return filteredLevels(stageId).length; }
  function classroomCount(levelId: string) { return filteredClassrooms(levelId).length; }
  function isLastClassroom(classroomId: string) {
    const cr = classrooms.find(c => c.id === classroomId);
    if (!cr) return false;
    const siblings = filteredClassrooms(cr.grade_level_id as string);
    return siblings.length > 0 && siblings[siblings.length - 1].id === classroomId;
  }

  // ─── Render ──────────────────────────────

  if (loading) return <div className="flex justify-center py-20"><Spinner className="size-8" /></div>;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{settingsT('manageEducationStructureTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ระดับการศึกษา · ชั้นปี · ห้องเรียน</p>
        </div>
        <Button onClick={openAddStage} size="sm"><Plus className="mr-2 h-4 w-4" />เพิ่มระดับการศึกษา</Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Tree */}
        <div className="w-80 shrink-0 border-r flex flex-col bg-muted/20">
          <div className="p-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {filteredStages.length === 0 && !search ? (
              <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
                <p>ยังไม่มีระดับการศึกษา</p>
                <Button size="sm" variant="outline" onClick={openAddStage}><Plus className="mr-2 h-3.5 w-3.5" />เพิ่มระดับการศึกษา</Button>
              </div>
            ) : filteredStages.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">ไม่พบรายการ</div>
            ) : (
              <div className="space-y-0.5">
                {filteredStages.map(stage => {
                  const isStageExpanded = expanded.has(stage.id);
                  const stageLevels = filteredLevels(stage.id);
                  const isStageSelected = selected?.type === 'stage' && selected.id === stage.id;

                  // Filter classrooms based on search
                  const visibleLevels = search
                    ? stageLevels.filter(l => {
                        if (l.name.toLowerCase().includes(search.toLowerCase())) return true;
                        return filteredClassrooms(l.id).length > 0;
                      })
                    : stageLevels;

                  return (
                    <div key={stage.id}>
                      {/* Stage row */}
                      <div
                        className={`flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors group ${
                          isStageSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                        }`}
                        onClick={() => selectNode('stage', stage.id)}
                      >
                        <button onClick={e => { e.stopPropagation(); toggle(stage.id); }} className="p-0.5 shrink-0">
                          {isStageExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                        <School className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate flex-1">{stageLabel(stage)}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{levelCount(stage.id)}</Badge>
                        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={saving} onClick={e => { e.stopPropagation(); openAddLevel(stage.id); }} title="เพิ่มชั้นปี">
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" disabled={saving} onClick={e => { e.stopPropagation(); openEditStage(stage); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {levelCount(stage.id) === 0 && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'stage', id: stage.id }); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Grade levels */}
                      {isStageExpanded && (
                        <div className="ml-4 border-l pl-2 space-y-0.5">
                          {visibleLevels.map(level => {
                            const isLevelExpanded = expanded.has(level.id);
                            const isLevelSelected = selected?.type === 'grade_level' && selected.id === level.id;
                            const lvlClassrooms = filteredClassrooms(level.id);

                            return (
                              <div key={level.id}>
                                <div
                                  className={`flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors group ${
                                    isLevelSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                                  }`}
                                  onClick={() => selectNode('grade_level', level.id)}
                                >
                                  <button onClick={e => { e.stopPropagation(); toggle(level.id); }} className="p-0.5 shrink-0">
                                    {isLevelExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  </button>
                                  <GraduationCap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span className="text-sm truncate flex-1">{level.name}</span>
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{classroomCount(level.id)}</Badge>
                                  <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                                    <Button variant="ghost" size="icon" className="h-5 w-5" disabled={saving} onClick={e => { e.stopPropagation(); openAddClassroom(level.id, stage.id); }} title="เพิ่มห้อง">
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => { e.stopPropagation(); openEditLevel(level); }}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    {classroomCount(level.id) === 0 && (
                                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'grade_level', id: level.id }); }}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Classrooms */}
                                {isLevelExpanded && (
                                  <div className="ml-4 border-l pl-2 space-y-0.5">
                                    {lvlClassrooms.map((cr, idx) => {
                                      const isCrSelected = selected?.type === 'classroom' && selected.id === cr.id;
                                      const isLast = idx === lvlClassrooms.length - 1;
                                      return (
                                        <div
                                          key={cr.id}
                                          className={`flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors group ${
                                            isCrSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                                          }`}
                                          onClick={() => selectNode('classroom', cr.id)}
                                        >
                                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                          <span className="text-sm truncate flex-1">{cr.name}</span>
                                          {cr.student_count != null && (
                                            <span className="text-[10px] text-muted-foreground shrink-0">{cr.student_count} คน</span>
                                          )}
                                          {isLast && (
                                            <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                                              <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'classroom', id: cr.id }); }}>
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    <button
                                      onClick={() => !saving && openAddClassroom(level.id, stage.id)}
                                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors"
                                    >
                                      <Plus className="h-3 w-3" /> เพิ่มห้องเรียน
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {isStageExpanded && (
                            <button
                              onClick={() => !saving && openAddLevel(stage.id)}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors"
                            >
                              <Plus className="h-3 w-3" /> เพิ่มชั้นปี
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {filteredStages.length > 0 && (
              <button
                onClick={() => !saving && openAddStage()}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted w-full transition-colors mt-1"
              >
                <Plus className="h-3 w-3" /> เพิ่มระดับการศึกษา
              </button>
            )}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedItem ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <Building className="h-10 w-10 opacity-20" />
              <p className="text-sm">เลือกโครงสร้างทางซ้ายเพื่อดูรายละเอียด</p>
              <p className="text-xs opacity-60">หรือกดปุ่มด้านบนเพื่อเพิ่มระดับการศึกษา</p>
            </div>
          ) : (
            <div className="max-w-lg space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {selected?.type === 'stage' && <School className="h-4 w-4 text-muted-foreground" />}
                    {selected?.type === 'grade_level' && <GraduationCap className="h-4 w-4 text-muted-foreground" />}
                    {selected?.type === 'classroom' && <BookOpen className="h-4 w-4 text-muted-foreground" />}
                    {selected?.type === 'stage' && stageLabel(selectedItem as StageItem)}
                    {selected?.type === 'grade_level' && (selectedItem as LevelItem).name}
                    {selected?.type === 'classroom' && (selectedItem as ClassroomItem).name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {selected?.type === 'stage' && (() => {
                    const s = selectedItem as StageItem;
                    return (
                      <>
                        <InfoRow label="ชื่อไทย" value={s.name_th} />
                        <InfoRow label="ชื่ออังกฤษ" value={s.name_en || '—'} />
                        <InfoRow label="สถานะ" value={s.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'} />
                        <InfoRow label="จำนวนชั้นปี" value={`${levelCount(s.id)} ชั้นปี`} />
                      </>
                    );
                  })()}
                  {selected?.type === 'grade_level' && (() => {
                    const l = selectedItem as LevelItem;
                    const s = selectedStageForLevel;
                    return (
                      <>
                        <InfoRow label="ชื่อ" value={l.name} />
                        <InfoRow label="ระดับการศึกษา" value={s ? stageLabel(s) : '—'} />
                        <InfoRow label="สถานะ" value={l.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'} />
                        <InfoRow label="จำนวนห้อง" value={`${classroomCount(l.id)} ห้อง`} />
                      </>
                    );
                  })()}
                  {selected?.type === 'classroom' && (() => {
                    const cr = selectedItem as ClassroomItem;
                    const l = selectedLevelForClassroom;
                    return (
                      <>
                        <InfoRow label="ชื่อห้อง" value={cr.name} />
                        <InfoRow label="ชั้นปี" value={l?.name || '—'} />
                        <InfoRow label="ระดับการศึกษา" value={cr.education_stage_name || '—'} />
                        <InfoRow label="ครูประจำชั้น" value={cr.homeroom_teacher_name || '—'} />
                        <InfoRow label="ครูผู้ช่วย" value={cr.advisor_teacher_name || '—'} />
                        <InfoRow label="จำนวนนักเรียน" value={`${cr.student_count ?? 0} คน`} />
                        <InfoRow label="จำนวนครู" value={`${cr.teacher_count ?? 0} คน`} />
                      </>
                    );
                  })()}
                </CardContent>
              </Card>

              {(() => {
                const hasChildren = selected?.type === 'stage'
                  ? levelCount(selected.id) > 0
                  : selected?.type === 'grade_level'
                    ? classroomCount(selected.id) > 0
                    : selected?.type === 'classroom'
                      ? !isLastClassroom(selected.id)
                      : false;
                return (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {selected?.type === 'stage' && (
                        <Button size="sm" variant="outline" onClick={() => openEditStage(selectedItem as StageItem)}><Pencil className="mr-2 h-3.5 w-3.5" />แก้ไข</Button>
                      )}
                      {selected?.type === 'grade_level' && (
                        <Button size="sm" variant="outline" onClick={() => openEditLevel(selectedItem as LevelItem)}><Pencil className="mr-2 h-3.5 w-3.5" />แก้ไข</Button>
                      )}
                      <Button size="sm" variant="destructive" disabled={hasChildren} onClick={() => setDeleteTarget({ type: selected!.type, id: selected!.id })}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" />ลบ
                      </Button>
                    </div>
                    {hasChildren && (
                      <p className="text-xs text-muted-foreground">
                        {selected?.type === 'stage' ? '⚠️ ต้องลบชั้นปีทั้งหมดก่อนลบระดับการศึกษา' : '⚠️ ต้องลบห้องเรียนทั้งหมดก่อนลบชั้นปี'}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ─── Stage Form Dialog ──────────────────── */}
      <StageFormDialog
        open={showStageForm}
        onOpenChange={setShowStageForm}
        editing={editingStage}
        saving={saving}
        onSave={handleSaveStage}
      />

      {/* ─── Level Form Dialog ──────────────────── */}
      <LevelFormDialog
        open={showLevelForm}
        onOpenChange={setShowLevelForm}
        editing={editingLevel}
        saving={saving}
        stages={stages}
        defaultStageId={selected?.type === 'stage' ? selected.id : editingLevel?.education_stage_id}
        onSave={handleSaveLevel}
        stageLabel={stageLabel}
      />

      {/* ─── Classroom Form Dialog ──────────────── */}
      <ClassroomFormDialog
        open={showClassroomForm}
        onOpenChange={setShowClassroomForm}
        editing={editingClassroom}
        saving={saving}
        levels={levels}
        stages={stages}
        defaultLevelId={selected?.type === 'grade_level' ? selected.id : editingClassroom?.grade_level_id}
        defaultStageId={editingClassroom?.education_stage_id}
        onSave={handleSaveClassroom}
        stageLabel={stageLabel}
      />

      {/* ─── Delete Confirm Dialog ──────────────── */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ</DialogTitle>
            <DialogDescription>คุณแน่ใจที่จะลบ &quot;{deleteLabel()}&quot; หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? 'กำลังลบ...' : 'ยืนยันลบ'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Info Row ──────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className={`text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

// ─── Stage Form Dialog ─────────────────────────

function StageFormDialog({
  open,
  onOpenChange,
  editing,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: OpenChangeHandler;
  editing: StageItem | null;
  saving: boolean;
  onSave: (data: StageFormData) => Promise<void>;
}) {
  const [data, setData] = useState({ name_th: '', name_en: '' });
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (editing) setData({ name_th: editing.name_th, name_en: editing.name_en || '' });
      else setData({ name_th: '', name_en: '' });
    });
  }, [editing, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไขระดับการศึกษา' : 'เพิ่มระดับการศึกษา'}</DialogTitle>
          <DialogDescription>{editing ? 'แก้ไขข้อมูลระดับการศึกษา' : 'สร้างระดับการศึกษาใหม่ เช่น ประถม มัธยมต้น มัธยมปลาย'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>ชื่อภาษาไทย <span className="text-destructive">*</span></Label>
            <Input value={data.name_th} onChange={e => setData({ ...data, name_th: e.target.value })} placeholder="ประถมศึกษา" />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อภาษาอังกฤษ</Label>
            <Input value={data.name_en} onChange={e => setData({ ...data, name_en: e.target.value })} placeholder="Primary Education" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={() => onSave(data)} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Level Form Dialog ─────────────────────────

function LevelFormDialog({
  open,
  onOpenChange,
  editing,
  saving,
  stages,
  defaultStageId,
  onSave,
  stageLabel,
}: {
  open: boolean;
  onOpenChange: OpenChangeHandler;
  editing: LevelItem | null;
  saving: boolean;
  stages: StageItem[];
  defaultStageId?: string;
  onSave: (data: LevelFormData) => Promise<void>;
  stageLabel: (stage: Pick<StageItem, 'code' | 'name_th'>) => string;
}) {
  const [data, setData] = useState<LevelFormData>({ education_stage_id: '', name: '', is_active: true });
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (editing) setData({ education_stage_id: editing.education_stage_id, name: editing.name, is_active: editing.is_active });
      else setData({ education_stage_id: defaultStageId || stages[0]?.id || '', name: '', is_active: true });
    });
  }, [editing, open, defaultStageId, stages]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไขชั้นปี' : 'เพิ่มชั้นปี'}</DialogTitle>
          <DialogDescription>ชั้นปีอยู่ภายใต้ระดับการศึกษา</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>ระดับการศึกษา</Label>
            <Input value={stageLabel(stages.find((s) => s.id === data.education_stage_id) || { code: '', name_th: '' })} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อ <span className="text-destructive">*</span></Label>
            <Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} placeholder="ป.1, ม.1, อนุบาล 1" />
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={data.is_active} onChange={e => setData({ ...data, is_active: e.target.checked })} className="h-4 w-4" />
              ใช้งาน
            </label>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={() => onSave(data)} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Classroom Form Dialog ─────────────────────

function ClassroomFormDialog({
  open,
  onOpenChange,
  editing,
  saving,
  levels,
  stages,
  defaultLevelId,
  defaultStageId,
  onSave,
  stageLabel,
}: {
  open: boolean;
  onOpenChange: OpenChangeHandler;
  editing: ClassroomItem | null;
  saving: boolean;
  levels: LevelItem[];
  stages: StageItem[];
  defaultLevelId?: string;
  defaultStageId?: string;
  onSave: (data: ClassroomFormData) => Promise<void>;
  stageLabel: (stage: Pick<StageItem, 'code' | 'name_th'>) => string;
}) {
  const [data, setData] = useState<ClassroomFormData>({ name: '', grade_level_id: '', education_stage_id: '', grade_level: 1 });
  const selectedLevel = levels.find((l) => l.id === data.grade_level_id);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (editing) {
        setData({ name: editing.name, grade_level_id: editing.grade_level_id || '', education_stage_id: editing.education_stage_id, grade_level: editing.grade_level });
      } else {
        const defaultLevel = levels.find((l) => l.id === defaultLevelId);
        setData({
          name: '',
          grade_level_id: defaultLevelId || '',
          education_stage_id: defaultStageId || defaultLevel?.education_stage_id || '',
          grade_level: defaultLevel?.level_no || 1,
        });
      }
      });
  }, [editing, open, defaultLevelId, defaultStageId, levels]);

  // Filter levels by stage
  const filteredLevels = levels.filter((l) => !data.education_stage_id || l.education_stage_id === data.education_stage_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'แก้ไขห้องเรียน' : 'เพิ่มห้องเรียน'}</DialogTitle>
          <DialogDescription>ห้องเรียนอยู่ภายใต้ชั้นปี</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>ระดับการศึกษา</Label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={data.education_stage_id}
              onChange={e => {
                const stageId = e.target.value;
                setData({ ...data, education_stage_id: stageId, grade_level_id: '' });
              }}
            >
              <option value="">เลือกระดับ</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{stageLabel(s)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>ชั้นปี <span className="text-destructive">*</span></Label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={data.grade_level_id}
              onChange={e => {
                const level = levels.find((l) => l.id === e.target.value);
                setData({ ...data, grade_level_id: e.target.value, grade_level: level?.level_no || 1 });
              }}
            >
              <option value="">เลือกชั้นปี</option>
              {filteredLevels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อห้อง <span className="text-destructive">*</span></Label>
            <Input
              value={data.name}
              onChange={e => setData({ ...data, name: e.target.value })}
              placeholder={selectedLevel ? `${selectedLevel.name}/1` : 'ป.1/1'}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button onClick={() => onSave(data)} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
