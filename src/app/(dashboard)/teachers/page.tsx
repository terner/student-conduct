'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Download, KeyRound, Plus, Power, PowerOff, Search, ShieldCheck, SquarePen, RotateCcw, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TeacherTable } from '@/components/features/teachers/teacher-table';
import { TeacherForm } from '@/components/features/teachers/teacher-form';
import { TeacherDetailContent } from '@/components/features/teachers/teacher-detail-content';
import { TablePaginationToolbar } from '@/components/ui/table-pagination-toolbar';
import { getTeachers, addTeacher, editTeacher, setTeacherActive, importTeachersCsv, resetTeacherPassword } from '@/lib/actions/teacher.action';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import type { TeacherInput } from '@/lib/validation/schemas';
import { exportCsv, parseCsvFile } from '@/lib/utils/csv';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DEFAULT_TEACHER_POSITION, DEFAULT_TEACHER_PREFIX } from '@/lib/domain/person';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function TeachersPage() {
  const teacherT = useTranslations('teacher');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const [data, setData] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TeacherWithProfile | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithProfile | null>(null);
  const [statusUpdatingTeacherId, setStatusUpdatingTeacherId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const detailStatusClassName = 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900 dark:text-green-300';
  const detailInactiveStatusClassName = 'border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900 dark:text-red-300';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const result = await getTeachers({ include_inactive: true });
    if (result.success && result.data) {
      setData(result.data);
      setPage(1);
      setLoading(false);
      return;
    } else {
      setData([]);
      toast(teacherT('loadError'), { description: !result.success ? result.error.message : undefined });
    }
    setLoading(false);
  }, [teacherT]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  // Derived: unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    data.forEach(t => { if (t.department) depts.add(t.department); });
    return Array.from(depts).sort();
  }, [data]);

  // Filter + paginate
  const filteredData = useMemo(() => {
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.full_name?.toLowerCase().includes(q) ||
        t.first_name?.toLowerCase().includes(q) ||
        t.last_name?.toLowerCase().includes(q) ||
        t.employee_id?.toLowerCase().includes(q)
      );
    }
    if (filterRole) {
      result = result.filter(t => {
        if (filterRole === 'superadmin') return t.roles?.includes('superadmin');
        if (filterRole === 'admin') return t.roles?.includes('admin') && !t.roles?.includes('superadmin');
        return !t.roles?.includes('admin') && !t.roles?.includes('superadmin');
      });
    }
    if (filterStatus) {
      result = result.filter(t => t.is_active === (filterStatus === 'active'));
    }
    if (filterDepartment) {
      result = result.filter(t => t.department === filterDepartment);
    }
    return result;
  }, [data, search, filterRole, filterStatus, filterDepartment]);

  const pagedData = useMemo(
    () => filteredData.slice((page - 1) * pageSize, page * pageSize),
    [filteredData, page, pageSize],
  );

  // Reset page when filters change
  useEffect(() => {
    void Promise.resolve().then(() => setPage(1));
  }, [search, filterRole, filterStatus, filterDepartment, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = filteredData.length === 0 ? 0 : Math.min((currentPage - 1) * pageSize + pagedData.length, filteredData.length);

  useEffect(() => {
    if (page > totalPages) {
      void Promise.resolve().then(() => setPage(1));
    }
  }, [page, totalPages]);

  const handleSubmit = async (formData: TeacherInput) => {
    const result = editItem
      ? await editTeacher(editItem.id, formData)
      : await addTeacher(formData);

    if (!result.success) {
      toast(teacherT('saveError'), { description: result.error.message });
      return;
    }

    const savedTeacher = result.data;
    setShowForm(false);
    setSelectedTeacher((current) => {
      if (!savedTeacher || current?.id !== savedTeacher.id) return current;
      return savedTeacher;
    });
    setEditItem(null);
    if (!savedTeacher) return;

    setData((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((item) => item.id === savedTeacher.id);

      if (existingIndex >= 0) {
        next[existingIndex] = savedTeacher;
        return next;
      }

      return [savedTeacher, ...next];
    });
  };

  const handleExport = () => {
    exportCsv(filteredData.map((teacher) => ({
      [teacherT('csvHeaderEmployeeId')]: teacher.employee_id ?? '',
      [teacherT('csvHeaderPrefix')]: teacher.prefix ?? '',
      [teacherT('csvHeaderFirstName')]: teacher.first_name ?? '',
      [teacherT('csvHeaderLastName')]: teacher.last_name ?? '',
      [teacherT('csvHeaderEmail')]: teacher.email ?? '',
      [teacherT('csvHeaderPhone')]: teacher.phone ?? '',
      [teacherT('csvHeaderDepartment')]: teacher.department ?? '',
      [teacherT('csvHeaderPosition')]: teacher.position ?? '',
      [teacherT('csvHeaderRole')]: teacher.roles?.includes('superadmin') ? 'superadmin' : teacher.roles?.includes('admin') ? 'admin' : 'teacher',
      [teacherT('csvHeaderHomeroom')]: teacher.assigned_classrooms?.filter(c => c.assignment_role === 'homeroom').map(c => c.classroom_name).join(', ') ?? '',
    })), `teachers_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleSetActive = async (teacher: TeacherWithProfile, isActive: boolean) => {
    setStatusUpdatingTeacherId(teacher.id);
    try {
      const result = await setTeacherActive(teacher.id, isActive);
      if (!result.success) {
        toast(isActive ? teacherT('activateFailed') : teacherT('deactivateFailed'), { description: result.error.message });
        return;
      }

      setData((current) => current.map((item) => (
        item.id === teacher.id
          ? { ...item, is_active: isActive }
          : item
      )));
      setSelectedTeacher((current) => (
        current?.id === teacher.id
          ? { ...current, is_active: isActive }
          : current
      ));

      toast(isActive ? teacherT('activated') : teacherT('deactivated'), {
        description: isActive ? undefined : teacherT('deactivatedDescription'),
      });
    } finally {
      setStatusUpdatingTeacherId(null);
    }
  };

  const handleResetPassword = async (teacher: TeacherWithProfile) => {
    const result = await resetTeacherPassword(teacher.id);
    if (result.success) {
      toast(teacherT('resetPasswordSent'), {
        description: teacher.email ? teacherT('resetPasswordSentDescription', { email: teacher.email }) : undefined,
      });
    } else {
      toast(teacherT('resetPasswordFailed'), { description: result.error?.message });
    }
  };

  const handleEditTeacher = (teacher: TeacherWithProfile) => {
    setSelectedTeacher(null);
    setEditItem(teacher);
    setShowForm(true);
  };

  const hasFilters = search || filterRole || filterStatus || filterDepartment;

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus(teacherT('importReadingFile'));
    try {
      const parsed = await parseCsvFile(file);
      if (parsed.data.length === 0) {
        toast(teacherT('importFailed'), { description: teacherT('importEmptyFile') });
        setImporting(false);
        setImportStatus('');
        return;
      }
      const total = parsed.data.length;
      setImportStatus(teacherT('importProgress', { count: total }));
      const toastId = toast.loading(teacherT('importLoadingTitle', { count: total }), { description: teacherT('importLoadingDescription') });

      const res = await importTeachersCsv(parsed.data);
      toast.dismiss(toastId);

      if (res.success) {
        const d = res.data;
        const skipped = d.errors.length;
        const successCount = d.imported;
        let desc = teacherT('importSuccessSummary', { count: successCount });
        if (skipped > 0) desc += `, ${teacherT('importSkippedSummary', { count: skipped })}`;
        toast.success(desc, {
          description: skipped > 0 ? teacherT('importSkippedDescription', { count: skipped }) : undefined,
        });
        fetchData();
      } else {
        toast.error(teacherT('importFailed'), { description: res.error?.message });
      }
    } catch (err) {
      console.error('[TeachersPage] Import failed:', err);
      toast.error(teacherT('importFailed'));
    } finally {
      setImporting(false);
      setImportStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const clearFilters = () => {
    setSearch('');
    setFilterRole('');
    setFilterStatus('');
    setFilterDepartment('');
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{teacherT('title')}</h1>
          <p className="text-muted-foreground mt-1">{teacherT('description')}</p>
        </div>
        <div className="grid w-full gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:justify-end">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} disabled={importing} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} className="w-full lg:w-auto">
            <Upload className="mr-2 h-4 w-4" />{importing ? importStatus || teacherT('importing') : teacherT('importCsv')}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filteredData.length === 0} className="w-full lg:w-auto">
            <Download className="mr-2 h-4 w-4" />{teacherT('exportCsv')}
          </Button>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="w-full sm:col-span-2 lg:w-auto">
            <Plus className="mr-2 h-4 w-4" />{teacherT('add')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-md border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,2fr)_minmax(130px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={teacherT('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 pl-9"
              autoFocus
            />
          </div>

          <Select
            value={filterRole || null}
            onValueChange={(v: string | null) => setFilterRole(v || '')}
          >
            <SelectTrigger className="!h-10 w-full">
              <SelectValue placeholder={teacherT('allRoles')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="superadmin">{teacherT('superadminRole')}</SelectItem>
              <SelectItem value="admin">{teacherT('adminRole')}</SelectItem>
              <SelectItem value="teacher">{teacherT('teacherRole')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterStatus || null}
            onValueChange={(v: string | null) => setFilterStatus(v || '')}
          >
            <SelectTrigger className="!h-10 w-full">
              <SelectValue placeholder={teacherT('allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{teacherT('active')}</SelectItem>
              <SelectItem value="inactive">{teacherT('inactive')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filterDepartment || null}
            onValueChange={(v: string | null) => setFilterDepartment(v || '')}
          >
            <SelectTrigger className="!h-10 w-full">
              <SelectValue placeholder={teacherT('allDepartments')} />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" onClick={clearFilters} disabled={!hasFilters} className="h-10">
            <RotateCcw className="mr-2 h-4 w-4" />
            {commonT('clear')}
          </Button>
        </div>
      </div>

      {!loading && filteredData.length > 0 && (
        <TablePaginationToolbar
          page={page}
          pageSize={pageSize}
          total={filteredData.length}
          summary={teacherT('resultsSummary', { from, to, total: filteredData.length })}
          rowsPerPageLabel={commonT('rowsPerPage')}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
          onPageChange={setPage}
        />
      )}

      <TeacherTable
        data={pagedData}
        loading={loading}
        statusUpdatingTeacherId={statusUpdatingTeacherId}
        onView={setSelectedTeacher}
        onEdit={handleEditTeacher}
        onSetActive={handleSetActive}
        onResetPassword={handleResetPassword}
      />

      <Dialog open={!!selectedTeacher} onOpenChange={(open) => !open && setSelectedTeacher(null)}>
        <DialogContent showCloseButton={false} className="inset-0 top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none p-0 sm:top-1/2 sm:left-1/2 sm:h-[min(94dvh,940px)] sm:w-[calc(100vw-1rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          {selectedTeacher ? (
            <>
              <div className="flex h-full flex-col">
                <DialogHeader className="border-b bg-background px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedTeacher(null)}>
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      {selectedTeacher.avatar_url ? (
                        <Image
                          src={selectedTeacher.avatar_url}
                          alt={teacherT('profilePhoto')}
                          width={48}
                          height={48}
                          unoptimized
                          className="size-12 shrink-0 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground">
                          {selectedTeacher.first_name?.slice(0, 1) || selectedTeacher.full_name?.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <DialogTitle className="min-w-0 break-words text-lg font-bold leading-tight sm:truncate sm:text-xl">
                              {selectedTeacher.full_name}
                            </DialogTitle>
                            <DialogDescription className="mt-1 break-words text-sm">
                              {selectedTeacher.position ?? teacherT('teacher')}
                              {selectedTeacher.employee_id ? ` · ${selectedTeacher.employee_id}` : ''}
                            </DialogDescription>
                          </div>
                          <div className="flex shrink-0 items-start gap-2">
                            <Badge
                              variant="outline"
                              className={selectedTeacher.is_active === false ? detailInactiveStatusClassName : detailStatusClassName}
                            >
                              {selectedTeacher.is_active === false ? teacherT('inactive') : teacherT('active')}
                            </Badge>
                            {selectedTeacher.roles?.includes('superadmin') ? (
                              <Badge className="hidden sm:inline-flex"><ShieldCheck className="mr-1 h-3 w-3" />{teacherT('superadmin')}</Badge>
                            ) : null}
                            {selectedTeacher.roles?.includes('admin') && !selectedTeacher.roles?.includes('superadmin') ? (
                              <Badge className="hidden sm:inline-flex"><ShieldCheck className="mr-1 h-3 w-3" />{teacherT('admin')}</Badge>
                            ) : null}
                            <DialogClose
                              render={<Button type="button" variant="ghost" size="icon" className="shrink-0 sm:hidden" aria-label={commonT('close')} />}
                            >
                              <X className="h-5 w-5" />
                            </DialogClose>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="hidden flex-wrap gap-2 pl-12 sm:pl-16 lg:flex lg:pl-0">
                      <Button type="button" variant="outline" onClick={() => handleEditTeacher(selectedTeacher)}>
                        <SquarePen className="mr-2 h-4 w-4" />
                        {commonT('edit')}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleResetPassword(selectedTeacher)}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        {studentT('resetPasswordAction')}
                      </Button>
                      {selectedTeacher.is_active === false ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={statusUpdatingTeacherId === selectedTeacher.id}
                          onClick={() => handleSetActive(selectedTeacher, true)}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {commonT('active')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-destructive"
                          disabled={statusUpdatingTeacherId === selectedTeacher.id}
                          onClick={() => handleSetActive(selectedTeacher, false)}
                        >
                          <PowerOff className="mr-2 h-4 w-4" />
                          {commonT('inactive')}
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain touch-pan-y">
                  <div className="flex min-h-full flex-col overflow-x-hidden pb-24 lg:pb-6">
                    <TeacherDetailContent teacher={selectedTeacher} />
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
                  <div className="flex items-stretch gap-2">
                    <Button type="button" className="min-w-0 flex-1" onClick={() => handleEditTeacher(selectedTeacher)}>
                      <SquarePen className="mr-2 h-4 w-4" />
                      {commonT('edit')}
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => handleResetPassword(selectedTeacher)} aria-label={studentT('resetPasswordAction')}>
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    {selectedTeacher.is_active === false ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        disabled={statusUpdatingTeacherId === selectedTeacher.id}
                        onClick={() => handleSetActive(selectedTeacher, true)}
                        aria-label={commonT('active')}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        disabled={statusUpdatingTeacherId === selectedTeacher.id}
                        onClick={() => handleSetActive(selectedTeacher, false)}
                        aria-label={commonT('inactive')}
                      >
                        <PowerOff className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto p-0 sm:w-full sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <DialogTitle>{editItem ? teacherT('edit') : teacherT('addNew')}</DialogTitle>
          </DialogHeader>
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <TeacherForm
              defaultValues={editItem ? {
                prefix: (editItem.prefix as TeacherInput['prefix']) || DEFAULT_TEACHER_PREFIX,
                first_name: editItem.first_name || editItem.full_name?.split(' ')[0] || '',
                last_name: editItem.last_name || editItem.full_name?.split(' ').slice(1).join(' ') || '',
                employee_id: editItem.employee_id,
                phone: editItem.phone || '',
                avatar_url: editItem.avatar_url || '',
                department: editItem.department,
                position: editItem.position || DEFAULT_TEACHER_POSITION,
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
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
