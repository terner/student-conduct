'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TeacherTable } from '@/components/features/teachers/teacher-table';
import { TeacherForm } from '@/components/features/teachers/teacher-form';
import { getTeachers, addTeacher, editTeacher } from '@/lib/actions/teacher.action';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import type { TeacherInput } from '@/lib/validation/schemas';

export default function TeachersPage() {
  const [data, setData] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TeacherWithProfile | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getTeachers();
    if (result.success && result.data) setData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (formData: TeacherInput) => {
    if (editItem) {
      await editTeacher(editItem.id, formData);
    } else {
      await addTeacher(formData);
    }
    setShowForm(false);
    setEditItem(null);
    fetchData();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการครู</h1>
          <p className="text-muted-foreground mt-1">เพิ่ม แก้ไข และกำหนดครูให้ห้องเรียน</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />เพิ่มครู
        </Button>
      </div>

      <TeacherTable
        data={data}
        loading={loading}
        onEdit={(t) => { setEditItem(t); setShowForm(true); }}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'แก้ไขข้อมูลครู' : 'เพิ่มครูใหม่'}</DialogTitle>
          </DialogHeader>
          <TeacherForm
            defaultValues={editItem ? {
              first_name: editItem.full_name?.split(' ')[0] || '',
              last_name: editItem.full_name?.split(' ').slice(1).join(' ') || '',
              employee_id: editItem.employee_id,
              department: editItem.department,
              email: editItem.email || '',
            } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditItem(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

