'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { studentSchema, studentPrefixEnum, type StudentInput } from '@/lib/validation/schemas';
import { getAcademicYears, getClassroomsForSelect } from '@/lib/actions/student.action';

interface StudentFormProps {
  defaultValues?: Partial<StudentInput>;
  classrooms?: { id: string; name: string; grade_level: number; education_stage?: string; academic_year_id?: string }[];
  onSubmit: (data: StudentInput) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

interface AcademicYear {
  id: string;
  name: string;
  is_current: boolean;
}

interface ClassroomOption {
  id: string;
  name: string;
  grade_level: number;
  education_stage?: string;
  academic_year_id?: string;
}

const PREFIX_LABELS: Record<string, string> = {
  'เด็กชาย': 'เด็กชาย',
  'เด็กหญิง': 'เด็กหญิง',
  'นาย': 'นาย',
  'นางสาว': 'นางสาว',
  'นาง': 'นาง',
};

export function StudentForm({ defaultValues, classrooms: propClassrooms, onSubmit, onCancel, loading }: StudentFormProps) {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [availableClassrooms, setAvailableClassrooms] = useState<ClassroomOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: (defaultValues || {
      prefix: 'เด็กชาย',
      first_name: '',
      last_name: '',
      student_id_number: '',
      classroom_id: '',
      class_number: 1,
      current_status: 'active',
    }) as StudentInput,
  });

  const classroomId = watch('classroom_id');
  const selectedClassroom = availableClassrooms.find(c => c.id === classroomId);

  // If classrooms are provided via props (backward compat), use those
  // but year filter still applies
  const displayClassrooms = propClassrooms && propClassrooms.length > 0
    ? propClassrooms.filter(c => !selectedYearId || c.academic_year_id === selectedYearId)
    : availableClassrooms;

  // Safe value for Base UI Select: null when no valid classroom is selected
  const safeClassroomValue = classroomId && displayClassrooms.some(c => c.id === classroomId)
    ? classroomId
    : null;

  // Safe value for Base UI Select: null when no valid option is selected
  const prefixValue = studentPrefixEnum.includes(watch('prefix') as any)
    ? watch('prefix')
    : null;
  const statusValue = (['active', 'inactive', 'transferred', 'graduated', 'suspended'] as string[]).includes(watch('current_status') || '')
    ? watch('current_status')
    : null;
  const yearValue = academicYears.some(y => y.id === selectedYearId) ? selectedYearId : null;

  // Load academic years on mount
  useEffect(() => {
    getAcademicYears().then((res) => {
      if (res.success && res.data) {
        setAcademicYears(res.data);
        // Auto-select current year
        const current = res.data.find((y: AcademicYear) => y.is_current);
        if (current) {
          setSelectedYearId(current.id);
        } else if (res.data.length > 0) {
          setSelectedYearId(res.data[0].id);
        }
      }
    });
  }, []);

  // Load classrooms when year changes
  const loadClassrooms = useCallback(async (yearId: string) => {
    setLoadingClassrooms(true);
    try {
      const res = await getClassroomsForSelect(yearId);
      if (res.success && res.data) {
        setAvailableClassrooms(res.data);
      }
    } finally {
      setLoadingClassrooms(false);
    }
  }, []);

  useEffect(() => {
    if (selectedYearId) {
      loadClassrooms(selectedYearId);
    }
  }, [selectedYearId, loadClassrooms]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Prefix + First Name + Last Name */}
      <div className="space-y-2">
        <Label>คำนำหน้า / ชื่อ-นามสกุล *</Label>
        <div className="flex gap-2">
          <div className="w-[130px] shrink-0">
            <Select
              value={prefixValue}
              onValueChange={(v) => v && setValue('prefix', v as StudentInput['prefix'])}
              itemToStringLabel={(value) => PREFIX_LABELS[value] || String(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="คำนำหน้า" />
              </SelectTrigger>
              <SelectContent>
                {studentPrefixEnum.map((p) => (
                  <SelectItem key={p} value={p} label={PREFIX_LABELS[p]}>
                    {PREFIX_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Input {...register('first_name')} placeholder="ชื่อ" />
            {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
          </div>
          <div className="flex-1">
            <Input {...register('last_name')} placeholder="นามสกุล" />
            {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="student_id_number">รหัสนักเรียน 10 หลัก *</Label>
        <Input id="student_id_number" {...register('student_id_number')} placeholder="เช่น 1234567890" maxLength={10} />
        {errors.student_id_number && <p className="text-xs text-destructive">{errors.student_id_number.message}</p>}
      </div>

      {/* Academic Year — must select first */}
      <div className="space-y-2">
        <Label>ปีการศึกษา *</Label>
        <Select
          value={yearValue}
          onValueChange={(v) => v && setSelectedYearId(v)}
          itemToStringLabel={(value) => {
            const y = academicYears.find(y => y.id === value);
            return y ? `${y.name}${y.is_current ? ' (ปัจจุบัน)' : ''}` : String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกปีการศึกษา" />
          </SelectTrigger>
          <SelectContent>
            {academicYears.map((y) => (
              <SelectItem key={y.id} value={y.id} label={`${y.name}${y.is_current ? ' (ปัจจุบัน)' : ''}`}>
                {y.name}{y.is_current ? ' (ปัจจุบัน)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Classroom — depends on selected year */}
      <div className="space-y-2">
        <Label>ห้องเรียน *</Label>
        <Select
          value={safeClassroomValue}
          onValueChange={(v) => {
            if (v) setValue('classroom_id', v, { shouldValidate: true });
          }}
          disabled={!selectedYearId || loadingClassrooms}
          itemToStringLabel={(value) => {
            const c = displayClassrooms.find(c => c.id === value);
            return c ? c.name : String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingClassrooms ? 'กำลังโหลด...' : (!selectedYearId ? 'เลือกปีการศึกษาก่อน' : 'เลือกห้องเรียน')} />
          </SelectTrigger>
          <SelectContent>
            {displayClassrooms.map((c) => (
              <SelectItem key={c.id} value={c.id} label={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.classroom_id && <p className="text-xs text-destructive">{errors.classroom_id.message}</p>}
      </div>

      {/* Class Number — after classroom */}
      <div className="space-y-2">
        <Label htmlFor="class_number">เลขที่ *</Label>
        <Input
          id="class_number"
          type="number"
          min={1}
          max={50}
          {...register('class_number', { valueAsNumber: true })}
        />
        {errors.class_number && <p className="text-xs text-destructive">{errors.class_number.message}</p>}
      </div>

      {defaultValues?.current_status && (
        <div className="space-y-2">
          <Label>สถานะ</Label>
          <Select
            value={statusValue}
            onValueChange={(v) => v && setValue('current_status', v as StudentInput['current_status'])}
            itemToStringLabel={(value) => {
              const labels: Record<string, string> = { active: 'กำลังศึกษา', inactive: 'ไม่ Active', transferred: 'ย้ายออก', graduated: 'จบการศึกษา', suspended: 'พักการเรียน' };
              return labels[value] || String(value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active" label="กำลังศึกษา">กำลังศึกษา</SelectItem>
              <SelectItem value="inactive" label="ไม่ Active">ไม่ Active</SelectItem>
              <SelectItem value="transferred" label="ย้ายออก">ย้ายออก</SelectItem>
              <SelectItem value="graduated" label="จบการศึกษา">จบการศึกษา</SelectItem>
              <SelectItem value="suspended" label="พักการเรียน">พักการเรียน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {defaultValues?.student_id_number ? 'บันทึก' : 'เพิ่มนักเรียน'}
        </Button>
      </div>
    </form>
  );
}
