'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TeacherTable } from '@/components/features/teachers/teacher-table';
import { TeacherForm } from '@/components/features/teachers/teacher-form';
import { getTeachers, addTeacher, editTeacher, setTeacherActive } from '@/lib/actions/teacher.action';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import type { TeacherInput } from '@/lib/validation/schemas';
import { exportCsv } from '@/lib/utils/csv';
import { toast } from 'sonner';

export default function TeachersPage() {
  const [data, setData] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TeacherWithProfile | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getTeachers({ include_inactive: true });
    if (result.success && result.data) {
      setData(result.data);
      setLoading(false);
      return;
    } else {
      setData([]);
      toast('โหลดข้อมูลครูไม่สำเร็จ', { description: !result.success ? result.error.message : undefined });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const handleSubmit = async (formData: TeacherInput) => {
    const result = editItem
      ? await editTeacher(editItem.id, formData)
      : await addTeacher(formData);

    if (!result.success) {
      toast('บันทึกข้อมูลครูไม่สำเร็จ', { description: result.error.message });
      return;
    }

    setShowForm(false);
    setEditItem(null);
    fetchData();
  };

  const handleExport = () => {
    exportCsv(data.map((teacher) => ({
      รหัสเจ้าหน้าที่: teacher.employee_id,
      คำนำหน้า: teacher.prefix || '',
      ชื่อ: teacher.first_name || '',
      นามสกุล: teacher.last_name || '',
      อีเมล: teacher.email || '',
      เบอร์โทร: teacher.phone || '',
      แผนก: teacher.department || '',
      ตำแหน่ง: teacher.position || 'ครู',
      สิทธิ์ในระบบ: teacher.roles?.includes('superadmin') ? 'superadmin' : teacher.roles?.includes('admin') ? 'admin' : 'teacher',
      ห้องที่ปรึกษา: teacher.assigned_classrooms?.map((c) => c.classroom_name).join(', ') || '',
    })), `teachers_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleSetActive = async (teacher: TeacherWithProfile, isActive: boolean) => {
    setUpdatingStatus(true);
    try {
      const result = await setTeacherActive(teacher.id, isActive);
      if (!result.success) {
        toast(isActive ? 'เปิดใช้งานครูไม่สำเร็จ' : 'ปิดใช้งานครูไม่สำเร็จ', { description: result.error.message });
        return;
      }

      toast(isActive ? 'เปิดใช้งานครูแล้ว' : 'ปิดใช้งานครูแล้ว', {
        description: isActive ? undefined : 'ข้อมูลครูและประวัติครูประจำห้องยังถูกเก็บไว้',
      });
      fetchData();
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายชื่อครูผู้สอน</h1>
          <p className="text-muted-foreground mt-1">เพิ่ม แก้ไข กำหนดสิทธิ์ และกำหนดครูให้ห้องเรียน</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
            <Download className="mr-2 h-4 w-4" />ส่งออก CSV
          </Button>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />เพิ่มครู
          </Button>
        </div>
      </div>

      <TeacherTable
        data={data}
        loading={loading || updatingStatus}
        onEdit={(t) => { setEditItem(t); setShowForm(true); }}
        onSetActive={handleSetActive}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? 'แก้ไขข้อมูลครู' : 'เพิ่มครูใหม่'}</DialogTitle>
          </DialogHeader>
          <TeacherForm
            defaultValues={editItem ? {
              prefix: (editItem.prefix as TeacherInput['prefix']) || 'นาย',
              first_name: editItem.first_name || editItem.full_name?.split(' ')[0] || '',
              last_name: editItem.last_name || editItem.full_name?.split(' ').slice(1).join(' ') || '',
              employee_id: editItem.employee_id,
              phone: editItem.phone || '',
              avatar_url: editItem.avatar_url || '',
              department: editItem.department,
              position: editItem.position || 'ครู',
              email: editItem.email || '',
              is_admin: editItem.roles?.includes('admin') || false,
              system_role: editItem.roles?.includes('superadmin')
                ? 'superadmin'
                : editItem.roles?.includes('admin')
                  ? 'admin'
                  : 'teacher',
            } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditItem(null); }}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}
