'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClassroomTable } from '@/components/features/classrooms/classroom-table';
import { ClassroomForm } from '@/components/features/classrooms/classroom-form';
import { getClassrooms, addClassroom, editClassroom, removeClassroom } from '@/lib/actions/classroom.action';
import type { ClassroomWithDetails } from '@/lib/db/queries/classroom.queries';
import type { ClassroomInput } from '@/lib/validation/schemas';

export default function ClassroomsPage() {
  const [data, setData] = useState<ClassroomWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ClassroomWithDetails | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getClassrooms();
    if (result.success && result.data) setData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (formData: ClassroomInput) => {
    if (editItem) {
      await editClassroom(editItem.id, formData);
    } else {
      await addClassroom(formData);
    }
    setShowForm(false);
    setEditItem(null);
    fetchData();
  };

  const handleDelete = async (item: ClassroomWithDetails) => {
    if (confirm(`ลบห้องเรียน "${item.name}" ใช่หรือไม่?`)) {
      await removeClassroom(item.id);
      fetchData();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ห้องเรียน</h1>
          <p className="text-muted-foreground mt-1">จัดการห้องเรียนและดูคะแนนรายห้อง</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />เพิ่มห้องเรียน
        </Button>
      </div>

      <ClassroomTable data={data} loading={loading} onEdit={(c) => { setEditItem(c); setShowForm(true); }} onDelete={handleDelete} />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'แก้ไขห้องเรียน' : 'เพิ่มห้องเรียน'}</DialogTitle></DialogHeader>
          <ClassroomForm
            defaultValues={editItem ? { name: editItem.name, education_stage_id: editItem.education_stage_id, grade_level: editItem.grade_level, academic_year: editItem.academic_year } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditItem(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

