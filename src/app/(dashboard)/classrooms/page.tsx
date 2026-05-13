'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClassroomTable } from '@/components/features/classrooms/classroom-table';
import { ClassroomForm } from '@/components/features/classrooms/classroom-form';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { getClassrooms, addClassroom, editClassroom, removeClassroom } from '@/lib/actions/classroom.action';
import { getEducationStages } from '@/lib/actions/education-stage.action';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';
import type { ClassroomInput } from '@/lib/validation/schemas';
import { toast } from 'sonner';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { useTranslations } from 'next-intl';

const PAGE_SIZE = 25;

interface StageOption {
  id: string;
  name_th: string;
  code: string;
}

export default function ClassroomsPage() {
  const classroomT = useTranslations('classroom');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [data, setData] = useState<ClassroomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ClassroomWithDetails | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStageId, setFilterStageId] = useState<string>('');
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [stages, setStages] = useState<StageOption[]>([]);

  const getStageLabel = (stage: StageOption) => {
    if (stage.code === 'secondary') return 'มัธยมต้น';
    if (stage.code === 'highschool') return 'มัธยมปลาย';
    return stage.name_th;
  };

  useEffect(() => {
    getEducationStages().then(res => {
      if (res.success && res.data) setStages(res.data as StageOption[]);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getClassrooms({
      education_stage_id: filterStageId || undefined,
      grade_level_id: filterGrade || undefined,
      academic_year_id: selectedAcademicYearId || undefined,
    });
    if (result.success && result.data) {
      setData(result.data);
      setPage(1);
      setLoading(false);
      return;
    } else {
      setData([]);
      toast(classroomT('loadError'), { description: !result.success ? result.error.message : undefined });
    }
    setLoading(false);
  }, [selectedAcademicYearId, filterStageId, filterGrade]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side search filter
  const filteredData = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.homeroom_teacher_name?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const pagedData = useMemo(() => filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredData, page]);

  useEffect(() => { setPage(1); }, [search]);

  // Grade options derived from classrooms
  const gradeOptions = useMemo(() => {
    const seen = new Map<string, { id: string; grade_level: number }>();
    data.forEach(c => {
      const key = c.grade_level_id || String(c.grade_level);
      if (!seen.has(key)) {
        seen.set(key, { id: c.grade_level_id || String(c.grade_level), grade_level: c.grade_level });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.grade_level - b.grade_level);
  }, [data]);

  const handleSubmit = async (formData: ClassroomInput) => {
    const result = editItem
      ? await editClassroom(editItem.id, formData)
      : await addClassroom(formData);

    if (!result.success) {
      toast(commonT('error'), { description: result.error?.message });
      return;
    }

    setShowForm(false);
    setEditItem(null);
    toast(editItem ? classroomT('editSuccess') : classroomT('addSuccess'));
    fetchData();
  };

  const handleDelete = async (item: ClassroomWithDetails) => {
    if (confirm(classroomT('confirmDelete', { name: item.name }))) {
      await removeClassroom(item.id);
      fetchData();
    }
  };

  const hasFilters = search || filterStageId || filterGrade;

  const clearFilters = () => {
    setSearch('');
    setFilterStageId('');
    setFilterGrade('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{classroomT('title')}</h1>
          <p className="text-muted-foreground mt-1">{classroomT('description')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-md border bg-background p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(200px,2fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อห้อง หรือครูประจำชั้น"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 pl-9"
              autoFocus
            />
          </div>

          <Select
            value={filterStageId || null}
            onValueChange={(v: string | null) => setFilterStageId(v || '')}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="ทุกระดับ" />
            </SelectTrigger>
            <SelectContent>
              {stages.map(s => (
                <SelectItem key={s.id} value={s.id} label={getStageLabel(s)}>{getStageLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterGrade || null}
            onValueChange={(v: string | null) => setFilterGrade(v || '')}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="ทุกชั้นปี" />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map(g => (
                <SelectItem key={g.id} value={g.id} label={`ชั้น ${g.grade_level}`}>{`ชั้น ${g.grade_level}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" onClick={clearFilters} disabled={!hasFilters} className="h-10">
            <RotateCcw className="mr-2 h-4 w-4" />
            {commonT('clear')}
          </Button>
        </div>
      </div>

      <ClassroomTable data={pagedData} loading={loading} onEdit={(c) => { setEditItem(c); setShowForm(true); }} onDelete={handleDelete} />
      <SimplePagination page={page} pageSize={PAGE_SIZE} total={filteredData.length} onPageChange={setPage} />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? classroomT('edit') : classroomT('add')}</DialogTitle></DialogHeader>
          <ClassroomForm
            defaultValues={editItem ? {
              name: editItem.name,
              education_stage_id: editItem.education_stage_id,
              grade_level_id: editItem.grade_level_id,
              grade_level: editItem.grade_level,
            } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditItem(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
