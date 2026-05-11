'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClassroomTable } from '@/components/features/classrooms/classroom-table';
import { ClassroomForm } from '@/components/features/classrooms/classroom-form';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { getClassrooms, addClassroom, editClassroom, removeClassroom } from '@/lib/actions/classroom.action';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';
import type { ClassroomInput } from '@/lib/validation/schemas';
import { toast } from 'sonner';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { useTranslations } from 'next-intl';

const PAGE_SIZE = 25;

export default function ClassroomsPage() {
  const classroomT = useTranslations('classroom');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [data, setData] = useState<ClassroomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ClassroomWithDetails | null>(null);
  const [page, setPage] = useState(1);
  const pagedData = useMemo(() => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getClassrooms({ academic_year_id: selectedAcademicYearId || undefined });
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
  }, [selectedAcademicYearId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{classroomT('title')}</h1>
          <p className="text-muted-foreground mt-1">{classroomT('description')}</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />{classroomT('add')}
        </Button>
      </div>

      <ClassroomTable data={pagedData} loading={loading} onEdit={(c) => { setEditItem(c); setShowForm(true); }} onDelete={handleDelete} />
      <SimplePagination page={page} pageSize={PAGE_SIZE} total={data.length} onPageChange={setPage} />

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
