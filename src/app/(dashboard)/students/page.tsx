'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { StudentTable } from '@/components/features/students/student-table';
import { StudentSearch } from '@/components/features/students/student-search';
import { StudentForm, type SubmitResult } from '@/components/features/students/student-form';
import { StudentDetailDialog } from '@/components/features/students/student-detail-dialog';
import { TablePaginationToolbar } from '@/components/ui/table-pagination-toolbar';
import { getStudents, getStudentScores, getStudentsForCsvExport, addStudent, editStudent, deleteStudent } from '@/lib/actions/student.action';
import { getScoreRecordingAvailability } from '@/lib/actions/score.action';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';
import { studentPrefixEnum, type StudentInput } from '@/lib/validation/schemas';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function StudentsPage() {
  const router = useRouter();
  const routeSearchParams = useSearchParams();
  const t = useTranslations('student');
  const common = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithProfile | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<StudentWithProfile | null>(null);
  const [actionError, setActionError] = useState<{ title: string; message?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const [selectedYearOpen, setSelectedYearOpen] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const routeStudentId = routeSearchParams.get('studentId');
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const activeDetailStudentId = detailStudentId ?? routeStudentId;

  const normalizeStudentPrefix = (value: string): StudentInput['prefix'] => (
    studentPrefixEnum.includes(value as StudentInput['prefix'])
      ? value as StudentInput['prefix']
      : studentPrefixEnum[0]
  );

  const normalizeGuardianRelation = (value?: string): StudentInput['guardian_relation'] => {
    const validRelations: NonNullable<StudentInput['guardian_relation']>[] = ['father', 'mother', 'guardian', 'relative', 'other'];
    return value && validRelations.includes(value as NonNullable<StudentInput['guardian_relation']>)
      ? value as StudentInput['guardian_relation']
      : 'guardian';
  };

  const loadStudents = useCallback(async () => {
    if (!selectedAcademicYearId) {
      setStudents([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await getStudents({
      ...searchParams,
      page,
      page_size: pageSize,
      academic_year: selectedAcademicYearId,
      includeScores: false,
    });

    if (result.success && result.data) {
      setStudents(result.data.data as StudentWithProfile[]);
      setTotal(result.data.total);
      setLoading(false);
      return;
    } else {
      setStudents([]);
      setTotal(0);
      toast(common('error'), { description: !result.success ? result.error.message : t('loadStudentsFailed') });
    }
    setLoading(false);
  }, [common, page, pageSize, searchParams, selectedAcademicYearId, t]);

  useEffect(() => {
    void Promise.resolve().then(() => loadStudents());
  }, [loadStudents]);

  useEffect(() => {
    if (!selectedAcademicYearId) {
      void Promise.resolve().then(() => setSelectedYearOpen(false));
      return;
    }

    let cancelled = false;
    Promise.resolve()
      .then(() => getScoreRecordingAvailability(selectedAcademicYearId))
      .then((result) => {
        if (cancelled) return;
        setSelectedYearOpen(Boolean(result.success && result.data?.can_record));
      })
      .catch(() => {
        if (!cancelled) setSelectedYearOpen(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYearId]);

  const handleSearch = useCallback((params: Record<string, string | undefined>) => {
    const cleaned: Record<string, string> = {};
    Object.entries(params).forEach(([k, v]) => {
      if (k !== 'academic_year' && v) cleaned[k] = v;
    });
    setSearchParams(cleaned);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((value: string | null) => {
    const nextPageSize = Number(value);
    if (!PAGE_SIZE_OPTIONS.includes(nextPageSize as typeof PAGE_SIZE_OPTIONS[number])) return;
    setPageSize(nextPageSize);
    setPage(1);
  }, []);

  const handleDetailOpenChange = useCallback((open: boolean) => {
    if (open) return;
    setDetailStudentId(null);
    if (routeStudentId) {
      router.replace('/students', { scroll: false });
    }
  }, [routeStudentId, router]);

  const handleAddStudent = async (formData: StudentInput & { avatar_url?: string }): Promise<SubmitResult | undefined> => {
    const result = await addStudent({
      prefix: formData.prefix,
      first_name: formData.first_name,
      last_name: formData.last_name,
      student_id_number: formData.student_id_number,
      classroom_id: formData.classroom_id,
      class_number: formData.class_number,
      avatar_url: formData.avatar_url,
      guardian_prefix: formData.guardian_prefix,
      guardian_first_name: formData.guardian_first_name,
      guardian_last_name: formData.guardian_last_name,
      guardian_full_name: formData.guardian_full_name,
      guardian_relation: formData.guardian_relation,
      guardian_phone: formData.guardian_phone,
    });

    if (result.success) {
      setShowAddForm(false);
      const name = `${formData.prefix}${formData.first_name} ${formData.last_name}`;
      toast(t('addSuccess'), { description: t('addSuccessDescription', { name }) });
      loadStudents();
      return;
    }

    if (result.error?.code === 'DUPLICATE_CLASS_NUMBER') {
      return { fieldErrors: { class_number: result.error.message } };
    }

    if (result.error?.code === 'DUPLICATE_STUDENT_ID') {
      return { fieldErrors: { student_id_number: result.error.message } };
    }

    setActionError({
      title: t('addFailedTitle'),
      message: result.error?.message,
    });
  };

  const handleEditStudent = async (formData: StudentInput & { avatar_url?: string }): Promise<SubmitResult | undefined> => {
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
      guardian_prefix: formData.guardian_prefix,
      guardian_first_name: formData.guardian_first_name,
      guardian_last_name: formData.guardian_last_name,
      guardian_full_name: formData.guardian_full_name,
      guardian_relation: formData.guardian_relation,
      guardian_phone: formData.guardian_phone,
    });

    if (result.success) {
      setEditingStudent(null);
      toast(t('editSuccess'));
      loadStudents();
      return;
    }

    if (result.error?.code === 'DUPLICATE_CLASS_NUMBER') {
      return { fieldErrors: { class_number: result.error.message } };
    }

    if (result.error?.code === 'DUPLICATE_STUDENT_ID') {
      return { fieldErrors: { student_id_number: result.error.message } };
    }

    setEditingStudent(null);
    setActionError({
      title: t('editFailedTitle'),
      message: result.error?.message,
    });
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      const result = await deleteStudent(deletingStudent.id);
      if (result.success) {
        setDeletingStudent(null);
        toast(t('deleteSuccess'), { description: t('deleteSuccessDescription') });
        loadStudents();
      } else {
        toast(common('error'), { description: result.error?.message });
      }
    } catch {
      toast(common('error'), { description: t('deleteErrorDescription') });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedAcademicYearId || exporting) return;
    setExporting(true);
    const { search, ...serverFilters } = searchParams;
    const result = await getStudentsForCsvExport({
      ...serverFilters,
      academic_year: selectedAcademicYearId,
    });
    setExporting(false);
    if (!result.success) {
      toast(t('exportCsvFailed'), { description: result.error.message });
      return;
    }

    const searchTerm = search?.trim().toLowerCase();
    const exportRows = searchTerm
      ? result.data.filter((row) => {
          const fullName = `${row.prefix}${row.first_name} ${row.last_name}`.toLowerCase();
          return row.student_id.toLowerCase().includes(searchTerm) || fullName.includes(searchTerm);
        })
      : result.data;

    // BOM for Thai characters in Excel
    const BOM = '﻿';
    const headers = [
      t('csvHeaderAcademicYear'),
      t('csvHeaderStudentId'),
      t('csvHeaderPrefix'),
      t('csvHeaderFirstName'),
      t('csvHeaderLastName'),
      t('csvHeaderGradeLevel'),
      t('csvHeaderClassroom'),
      t('csvHeaderClassNumber'),
      t('csvHeaderEducationStage'),
      t('csvHeaderStatus'),
      t('csvHeaderGuardianPrefix'),
      t('csvHeaderGuardianFirstName'),
      t('csvHeaderGuardianLastName'),
      t('csvHeaderGuardianRelation'),
      t('csvHeaderGuardianPhone'),
    ];
    const rows = exportRows.map((s) => [
      s.academic_year,
      s.student_id,
      s.prefix,
      s.first_name,
      s.last_name,
      String(s.grade_level),
      s.classroom,
      String(s.class_number),
      s.education_stage,
      s.status,
      s.guardian_prefix,
      s.guardian_first_name,
      s.guardian_last_name,
      s.guardian_relation,
      s.guardian_phone,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('exportFileName', {
      year: exportRows[0]?.academic_year ?? '',
      date: new Date().toISOString().slice(0, 10),
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load scores for visible students only
  useEffect(() => {
    const visibleIds = students.map((s) => s.id);
    if (visibleIds.length === 0 || !selectedAcademicYearId) {
      return;
    }

    let cancelled = false;
    void getStudentScores(visibleIds, selectedAcademicYearId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setScores((prev) => ({ ...prev, ...result.data }));
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students.map((s) => s.id).join(','), selectedAcademicYearId]);

  // Merge scores into data
  const displayData = useMemo(() => {
    return students.map((s) => ({
      ...s,
      current_score: scores[s.id] ?? s.current_score,
    }));
  }, [scores, students]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total === 0 ? 0 : (page - 1) * pageSize + students.length;

  useEffect(() => {
    if (page > totalPages) {
      void Promise.resolve().then(() => setPage(1));
    }
  }, [page, totalPages]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t('list')}</h1>
          <p className="text-muted-foreground mt-1">{t('manageDescription')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExportCSV} disabled={total === 0 || exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? t('exportingCsv') : t('exportCsv')}
          </Button>
          {selectedYearOpen && (
            <Button variant="outline" className="flex-1 sm:flex-none" nativeButton={false} render={<a href="/settings/import" />}>
              <Upload className="mr-2 h-4 w-4" />
              {t('importCsv')}
            </Button>
          )}
          {selectedYearOpen && (
          <Button className="w-full sm:w-auto" onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('add')}
          </Button>
          )}
        </div>
      </div>

      <StudentSearch onSearch={handleSearch} />

      {!loading && total > 0 && (
        <TablePaginationToolbar
          page={page}
          pageSize={pageSize}
          total={total}
          summary={t('resultsSummary', { total, from, to })}
          onPageChange={setPage}
          rowsPerPageLabel={t('rowsPerPage')}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(nextPageSize) => {
            handlePageSizeChange(String(nextPageSize));
          }}
        />
      )}

      <StudentTable
        data={displayData}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        hidePagination
        onView={(student) => setDetailStudentId(student.id)}
        onEdit={selectedYearOpen ? setEditingStudent : undefined}
        onDelete={selectedYearOpen ? setDeletingStudent : undefined}
      />

      {activeDetailStudentId && (
        <StudentDetailDialog
          studentId={activeDetailStudentId}
          onClose={() => handleDetailOpenChange(false)}
        />
      )}

      {/* Add Student Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('addNew')}</DialogTitle>
            <DialogDescription>
              {t('addDescription')}
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
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('edit')}</DialogTitle>
            <DialogDescription>
              {t('editDescription')}
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <StudentForm
              defaultValues={{
              prefix: normalizeStudentPrefix(editingStudent.prefix),
              first_name: editingStudent.first_name,
              last_name: editingStudent.last_name,
              student_id_number: editingStudent.student_id_number,
              classroom_id: editingStudent.classroom_id,
                class_number: editingStudent.class_number ?? 1,
                avatar_url: editingStudent.avatar_url ?? '',
                current_status: editingStudent.current_status,
                guardian_full_name: editingStudent.guardian_full_name ?? '',
                guardian_relation: normalizeGuardianRelation(editingStudent.guardian_relation),
                guardian_phone: editingStudent.guardian_phone ?? '',
              }}
              onSubmit={handleEditStudent}
              onCancel={() => setEditingStudent(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionError} onOpenChange={(open: boolean) => !open && setActionError(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{actionError?.title}</DialogTitle>
            {actionError?.message && <DialogDescription>{actionError.message}</DialogDescription>}
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setActionError(null)}>{t('acknowledge')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingStudent} onOpenChange={(open: boolean) => !open && setDeletingStudent(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
            {deletingStudent && (
              <DialogDescription>
                {t('deleteConfirmDescription', {
                    name: `${deletingStudent.prefix}${deletingStudent.first_name} ${deletingStudent.last_name}`,
                    id: deletingStudent.student_id_number,
                  })}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeletingStudent(null)}>{common('cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteStudent} disabled={deleting}>
              {deleting ? t('deleting') : t('deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
