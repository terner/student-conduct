'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StudentTable } from '@/components/features/students/student-table';
import { StudentSearch } from '@/components/features/students/student-search';
import { StudentForm } from '@/components/features/students/student-form';
import { getStudents, addStudent } from '@/lib/actions/student.action';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';
import type { StudentInput } from '@/lib/validation/schemas';

export default function StudentsPage() {
  const [data, setData] = useState<StudentWithProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string; grade_level: number; education_stage: string }[]>([]);
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

  useEffect(() => {
    // Load classrooms for the form via server action
    async function loadClassrooms() {
      const { getClassroomsForSelect } = await import('@/lib/actions/student.action');
      const res = await getClassroomsForSelect();
      if (res.success && res.data) setClassrooms(res.data);
    }
    loadClassrooms();
  }, []);

  const handleSearch = useCallback((params: Record<string, string | undefined>) => {
    const cleaned: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (v) cleaned[k] = v;
    });
    setSearchParams(cleaned);
    setPage(1);
    fetchData(cleaned, 1);
  }, [fetchData]);

  const handleAddStudent = async (formData: StudentInput) => {
    const result = await addStudent({
      first_name: formData.first_name,
      last_name: formData.last_name,
      student_id_number: formData.student_id_number,
      classroom_id: formData.classroom_id,
      class_number: formData.class_number,
    });

    if (result.success) {
      setShowAddForm(false);
      fetchData(searchParams, page);
    } else {
      throw new Error(result.error?.message || 'เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายชื่อนักเรียน</h1>
          <p className="text-muted-foreground mt-1">จัดการข้อมูลนักเรียนในระบบ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<a href="/settings/import" />}>
            <Upload className="mr-2 h-4 w-4" />
            นำเข้า CSV
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มนักเรียน
          </Button>
        </div>
      </div>

      <StudentSearch onSearch={handleSearch} classrooms={classrooms} />

      <StudentTable
        data={data}
        loading={loading}
        total={total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
      />

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มนักเรียนใหม่</DialogTitle>
            <DialogDescription>
              ระบบจะสร้างบัญชีผู้ใช้นักเรียนและข้อมูลพื้นฐาน
            </DialogDescription>
          </DialogHeader>
          <StudentForm
            classrooms={classrooms}
            onSubmit={handleAddStudent}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

