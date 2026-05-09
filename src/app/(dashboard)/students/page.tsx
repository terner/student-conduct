'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { StudentTable } from '@/components/features/students/student-table';
import { StudentSearch } from '@/components/features/students/student-search';
import { StudentForm } from '@/components/features/students/student-form';
import { getStudents, addStudent, editStudent, deleteStudent } from '@/lib/actions/student.action';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';
import type { StudentInput } from '@/lib/validation/schemas';

export default function StudentsPage() {
  const [data, setData] = useState<StudentWithProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithProfile | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentWithProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});

  const fetchData = useCallback(async (params: Record<string, string> = {}, pageNum = 1) => {
    setLoading(true);
    const result = await getStudents({ ...params, page: pageNum });
    if (result.success && result.data) {
      setData(result.data.data as unknown as StudentWithProfile[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(searchParams, page);
  }, [page, fetchData]);

  const handleSearch = useCallback((params: Record<string, string | undefined>) => {
    const cleaned: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v) cleaned[k] = v;
    });
    setSearchParams(cleaned);
    setPage(1);
    fetchData(cleaned, 1);
  }, [fetchData]);

  const handleAddStudent = async (formData: StudentInput & { avatar_url?: string }) => {
    const result = await addStudent({
      prefix: formData.prefix,
      first_name: formData.first_name,
      last_name: formData.last_name,
      student_id_number: formData.student_id_number,
      classroom_id: formData.classroom_id,
      class_number: formData.class_number,
      avatar_url: formData.avatar_url,
    });

    if (result.success) {
      setShowAddForm(false);
      toast('เพิ่มนักเรียนสำเร็จ', { description: `เพิ่ม ${formData.prefix}${formData.first_name} ${formData.last_name} เข้าระบบแล้ว` });
      fetchData(searchParams, page);
    } else {
      throw new Error(result.error?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleEditStudent = async (formData: StudentInput & { avatar_url?: string }) => {
    if (!editingStudent) return;
    const result = await editStudent(editingStudent.id, {
      prefix: formData.prefix,
      first_name: formData.first_name,
      last_name: formData.last_name,
      student_id_number: formData.student_id_number,
      classroom_id: formData.classroom_id,
      current_status: formData.current_status,
      class_number: formData.class_number,
      avatar_url: formData.avatar_url,
    });

    if (result.success) {
      setEditingStudent(null);
      toast('แก้ไขข้อมูลนักเรียนสำเร็จ');
      fetchData(searchParams, page);
    } else {
      throw new Error(result.error?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      const result = await deleteStudent(deletingStudent.id);
      if (result.success) {
        setDeletingStudent(null);
        toast('ลบนักเรียนสำเร็จ', { description: 'ข้อมูลนักเรียนถูกย้ายไปสถานะไม่ active' });
        fetchData(searchParams, page);
      } else {
        toast('เกิดข้อผิดพลาด', { description: result.error?.message });
      }
    } catch {
      toast('เกิดข้อผิดพลาด', { description: 'ไม่สามารถลบข้อมูลนักเรียนได้' });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    // BOM for Thai characters in Excel
    const BOM = '﻿';
    const headers = ['รหัสนักเรียน', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ห้องเรียน', 'ชั้นปี', 'ระดับ', 'สถานะ'];
    const rows = data.map((s) => [
      s.student_id_number,
      s.prefix,
      s.first_name,
      s.last_name,
      s.classroom_name,
      String(s.grade_level),
      s.education_stage === 'primary' ? 'ประถม' : 'มัธยม',
      s.current_status === 'active' ? 'กำลังศึกษา' : s.current_status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายชื่อนักเรียน</h1>
          <p className="text-muted-foreground mt-1">จัดการข้อมูลนักเรียนในระบบ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={data.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            ส่งออก CSV
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href="/settings/import" />}>
            <Upload className="mr-2 h-4 w-4" />
            นำเข้า CSV
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มนักเรียน
          </Button>
        </div>
      </div>

      <StudentSearch onSearch={handleSearch} />

      <StudentTable
        data={data}
        loading={loading}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
        onEdit={setEditingStudent}
        onDelete={setDeletingStudent}
      />

      {/* Add Student Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มนักเรียนใหม่</DialogTitle>
            <DialogDescription>
              ระบบจะสร้างบัญชีผู้ใช้นักเรียนและข้อมูลพื้นฐาน
            </DialogDescription>
          </DialogHeader>
          <StudentForm
            onSubmit={handleAddStudent}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open: boolean) => !open && setEditingStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขข้อมูลนักเรียน</DialogTitle>
            <DialogDescription>
              แก้ไขข้อมูลส่วนตัวของนักเรียน
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <StudentForm
              defaultValues={{
                prefix: (editingStudent.prefix as any) || 'เด็กชาย',
                first_name: editingStudent.first_name,
                last_name: editingStudent.last_name,
                student_id_number: editingStudent.student_id_number,
                classroom_id: editingStudent.classroom_id,
                class_number: (editingStudent as any).class_number || 1,
                current_status: editingStudent.current_status,
              }}
              onSubmit={handleEditStudent}
              onCancel={() => setEditingStudent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingStudent} onOpenChange={(open: boolean) => !open && setDeletingStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันการลบนักเรียน</DialogTitle>
            <DialogDescription>
              คุณต้องการลบนักเรียน <strong>{deletingStudent?.prefix}{deletingStudent?.first_name} {deletingStudent?.last_name}</strong> (รหัส: {deletingStudent?.student_id_number})?
              ข้อมูลจะถูกย้ายไปสถานะไม่ active และสามารถกู้คืนได้ภายหลัง
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeletingStudent(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDeleteStudent} disabled={deleting}>
              {deleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

