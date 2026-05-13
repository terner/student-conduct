'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { Download, Plus, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TeacherTable } from '@/components/features/teachers/teacher-table';
import { TeacherForm } from '@/components/features/teachers/teacher-form';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { getTeachers, addTeacher, editTeacher, setTeacherActive } from '@/lib/actions/teacher.action';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import type { TeacherInput } from '@/lib/validation/schemas';
import { exportCsv } from '@/lib/utils/csv';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

const PAGE_SIZE = 25;

export default function TeachersPage() {
  const teacherT = useTranslations('teacher');
  const studentT = useTranslations('student');
  const commonT = useTranslations('common');
  const [data, setData] = useState<TeacherWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<TeacherWithProfile | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');

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

  const pagedData = useMemo(() => filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredData, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterRole, filterStatus, filterDepartment]);

  const handleSubmit = async (formData: TeacherInput) => {
    const result = editItem
      ? await editTeacher(editItem.id, formData)
      : await addTeacher(formData);

    if (!result.success) {
      toast(teacherT('saveError'), { description: result.error.message });
      return;
    }

    setShowForm(false);
    setEditItem(null);
    fetchData();
  };

  const handleExport = () => {
    exportCsv(filteredData.map((teacher) => ({
      [teacherT('employeeId')]: teacher.employee_id || '',
      [teacherT('prefix')]: teacher.prefix || '',
      [studentT('firstName')]: teacher.first_name || '',
      [studentT('lastName')]: teacher.last_name || '',
      [teacherT('email')]: teacher.email || '',
      [teacherT('phone')]: teacher.phone || '',
      [teacherT('department')]: teacher.department || '',
      [teacherT('position')]: teacher.position || teacherT('teacher'),
      [teacherT('systemRole')]: teacher.roles?.includes('superadmin') ? 'superadmin' : teacher.roles?.includes('admin') ? 'admin' : 'teacher',
      [teacherT('advisorRooms')]: teacher.assigned_classrooms?.map((c) => c.classroom_name).join(', ') || '',
    })), `teachers_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleSetActive = async (teacher: TeacherWithProfile, isActive: boolean) => {
    setUpdatingStatus(true);
    try {
      const result = await setTeacherActive(teacher.id, isActive);
      if (!result.success) {
        toast(isActive ? teacherT('activateFailed') : teacherT('deactivateFailed'), { description: result.error.message });
        return;
      }

      toast(isActive ? teacherT('activated') : teacherT('deactivated'), {
        description: isActive ? undefined : teacherT('deactivatedDescription'),
      });
      fetchData();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const hasFilters = search || filterRole || filterStatus || filterDepartment;

  const clearFilters = () => {
    setSearch('');
    setFilterRole('');
    setFilterStatus('');
    setFilterDepartment('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{teacherT('title')}</h1>
          <p className="text-muted-foreground mt-1">{teacherT('description')}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filteredData.length === 0}>
            <Download className="mr-2 h-4 w-4" />{teacherT('exportCsv')}
          </Button>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" />{teacherT('add')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-md border bg-background p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(200px,2fr)_minmax(130px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_auto]">
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
            <SelectTrigger className="h-10 w-full">
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
            <SelectTrigger className="h-10 w-full">
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
            <SelectTrigger className="h-10 w-full">
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

      <TeacherTable
        data={pagedData}
        loading={loading || updatingStatus}
        onEdit={(t) => { setEditItem(t); setShowForm(true); }}
        onSetActive={handleSetActive}
      />
      <SimplePagination page={page} pageSize={PAGE_SIZE} total={filteredData.length} onPageChange={setPage} />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? teacherT('edit') : teacherT('addNew')}</DialogTitle>
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
