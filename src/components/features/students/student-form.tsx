'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { studentSchema, studentPrefixEnum, type StudentInput } from '@/lib/validation/schemas';
import { getAcademicYears, getClassroomsForSelect } from '@/lib/actions/student.action';
import { getEducationStages } from '@/lib/actions/education-stage.action';

interface StudentFormProps {
  defaultValues?: Partial<StudentInput> & { avatar_url?: string };
  classrooms?: { id: string; name: string; grade_level_id?: string; grade_level_name?: string; grade_level: number; education_stage_id?: string; academic_year_id?: string }[];
  onSubmit: (data: StudentInput & { avatar_url?: string }) => Promise<void>;
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
  grade_level_id?: string;
  grade_level_name?: string;
  grade_level: number;
  education_stage_id: string;
  academic_year_id?: string;
}

interface StageOption {
  id: string;
  name_th: string;
}

const PREFIX_LABELS: Record<string, string> = {
  'เด็กชาย': 'เด็กชาย',
  'เด็กหญิง': 'เด็กหญิง',
  'นาย': 'นาย',
  'นางสาว': 'นางสาว',
  'นาง': 'นาง',
};

export function StudentForm({ defaultValues, classrooms: propClassrooms, onSubmit, onCancel, loading }: StudentFormProps) {
  const t = useTranslations('student');
  const common = useTranslations('common');
  const settingsT = useTranslations('settings');
  const guardianRelationLabels: Record<string, string> = {
    father: t('guardianRelationFather'),
    mother: t('guardianRelationMother'),
    guardian: t('guardian'),
    relative: t('guardianRelationRelative'),
    other: t('guardianRelationOther'),
  };
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [availableClassrooms, setAvailableClassrooms] = useState<ClassroomOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string | null>(null);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(defaultValues?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const didInitializeYear = useRef(false);

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
      guardian_full_name: '',
      guardian_relation: 'guardian',
      guardian_phone: '',
    }) as StudentInput,
  });

  const classroomId = watch('classroom_id');
  const selectedClassroom = availableClassrooms.find(c => c.id === classroomId);

  // If classrooms are provided via props (backward compat), use those
  const displayClassrooms = useMemo(() => {
    if (propClassrooms && propClassrooms.length > 0) {
      return propClassrooms.filter(c => !selectedYearId || c.academic_year_id === selectedYearId);
    }
    return availableClassrooms;
  }, [availableClassrooms, propClassrooms, selectedYearId]);

  // Unique grade levels from classrooms, sorted
  const gradeLevels = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; order: number }>();
    displayClassrooms.forEach((c) => {
      const id = c.grade_level_id || String(c.grade_level);
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          label: c.grade_level_name || c.name.split('/')[0]?.trim() || String(c.grade_level),
          order: c.grade_level,
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.order - b.order);
  }, [displayClassrooms]);

  useEffect(() => {
    if (selectedGradeLevel !== null && !gradeLevels.some(level => level.id === selectedGradeLevel)) {
      setSelectedGradeLevel(null);
      setValue('classroom_id', '', { shouldValidate: true });
    }
  }, [gradeLevels, selectedGradeLevel, setValue]);

  // Filter classrooms by selected grade level
  const filteredClassrooms = selectedGradeLevel
    ? displayClassrooms.filter(c => (c.grade_level_id || String(c.grade_level)) === selectedGradeLevel)
    : displayClassrooms;

  // Stage name map for display
  const stageNameMap = useMemo(() => {
    const map = new Map<string, string>();
    stages.forEach(s => map.set(s.id, s.name_th));
    return map;
  }, [stages]);

  // Safe value for Base UI Select: null when no valid classroom is selected
  const safeClassroomValue = classroomId && filteredClassrooms.some(c => c.id === classroomId)
    ? classroomId
    : null;

  // Safe value for Base UI Select: null when no valid option is selected
  const prefixValue = studentPrefixEnum.includes(watch('prefix') as any)
    ? watch('prefix')
    : null;
  const statusValue = (['active', 'inactive', 'transferred', 'graduated', 'suspended'] as string[]).includes(watch('current_status') || '')
    ? watch('current_status')
    : null;
  const guardianRelationValue = (['father', 'mother', 'guardian', 'relative', 'other'] as string[]).includes(watch('guardian_relation') || '')
    ? watch('guardian_relation')
    : 'guardian';

  function formatGradeLabel(level: { id: string; label: string }): string {
    const classroom = displayClassrooms.find(c => (c.grade_level_id || String(c.grade_level)) === level.id);
    const stageName = classroom?.education_stage_id ? stageNameMap.get(classroom.education_stage_id) : '';
    return stageName ? `${stageName} ${level.label}` : level.label;
  }

  // Load academic years and stages on mount, auto-select current year
  useEffect(() => {
    Promise.all([
      getAcademicYears(),
      getEducationStages(),
    ]).then(([yearRes, stageRes]) => {
      if (yearRes.success && yearRes.data) {
        setAcademicYears(yearRes.data);
        const current = yearRes.data.find((y: AcademicYear) => y.is_current);
        if (current) {
          setSelectedYearId(current.id);
        }
      }
      if (stageRes.success && stageRes.data) {
        setStages(stageRes.data);
      }
    });
  }, []);

  // Load classrooms when year changes
  const loadClassrooms = useCallback(async (yearId: string) => {
    setLoadingClassrooms(true);
    setAvailableClassrooms([]);
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
      if (didInitializeYear.current) {
        setSelectedGradeLevel(null);
        setValue('classroom_id', '', { shouldValidate: true });
      } else {
        didInitializeYear.current = true;
      }
      loadClassrooms(selectedYearId);
    }
  }, [selectedYearId, loadClassrooms, setValue]);

  useEffect(() => {
    if (!defaultValues?.classroom_id || selectedGradeLevel !== null) return;
    const selectedDefaultClassroom = displayClassrooms.find(c => c.id === defaultValues.classroom_id);
    if (selectedDefaultClassroom) {
      setSelectedGradeLevel(selectedDefaultClassroom.grade_level_id || String(selectedDefaultClassroom.grade_level));
    }
  }, [defaultValues?.classroom_id, displayClassrooms, selectedGradeLevel]);

  // Upload avatar handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(settingsT('logoFileTooLarge'));
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner_id', defaultValues?.student_id_number || `temp-${Date.now()}`);
      formData.append('owner_type', 'student');
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: formData });
      const result = await res.json();
      if (res.ok && result.url) {
        setAvatarUrl(result.url);
      } else {
        alert(result.error || t('uploadFailed'));
      }
    } catch {
      alert(t('uploadError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit({ ...data, avatar_url: avatarUrl || undefined }))} className="space-y-4">
      <div className="space-y-2">
        <Label>{t('photo')}</Label>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <div className="relative">
              <img src={avatarUrl} alt={t('photo')} className="size-16 rounded-full object-cover border" />
              <button
                type="button"
                className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5"
                onClick={() => setAvatarUrl('')}
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="size-16 rounded-full border border-dashed flex items-center justify-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          )}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              {uploadingAvatar ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              <span>{uploadingAvatar ? t('uploadingPhoto') : t('choosePhoto')}</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingAvatar}
              onChange={handleAvatarUpload}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('photoHelp')}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{t('nameFields')}</Label>
        <div className="grid gap-2 sm:grid-cols-[130px_1fr_1fr]">
          <div>
            <Select
              value={prefixValue}
              onValueChange={(v) => v && setValue('prefix', v as StudentInput['prefix'])}
              itemToStringLabel={(value) => PREFIX_LABELS[value] || String(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('prefix')} />
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
            <Input {...register('first_name')} placeholder={t('firstName')} />
            {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
          </div>
          <div className="flex-1">
            <Input {...register('last_name')} placeholder={t('lastName')} />
            {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="student_id_number">{t('idTenDigits')} *</Label>
        <Input id="student_id_number" {...register('student_id_number')} placeholder={t('idPlaceholder')} maxLength={10} />
        {errors.student_id_number && <p className="text-xs text-destructive">{errors.student_id_number.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t('gradeLevel')} *</Label>
          <Select
            value={selectedGradeLevel}
            onValueChange={(v) => {
              if (v) {
                setSelectedGradeLevel(v);
                setValue('classroom_id', '', { shouldValidate: true });
              }
            }}
            disabled={loadingClassrooms || gradeLevels.length === 0}
            itemToStringLabel={(value) => {
              const level = gradeLevels.find(item => item.id === value);
              return level ? formatGradeLabel(level) : String(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingClassrooms ? t('loadingClassrooms') : t('selectGrade')} />
            </SelectTrigger>
            <SelectContent>
              {gradeLevels.map((level) => (
                <SelectItem key={level.id} value={level.id} label={formatGradeLabel(level)}>
                  {formatGradeLabel(level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loadingClassrooms && selectedYearId && gradeLevels.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('noClassroomsCurrentYear')}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('classroom')} *</Label>
          <Select
            value={safeClassroomValue}
            onValueChange={(v) => {
              if (v) setValue('classroom_id', v, { shouldValidate: true });
            }}
            disabled={!selectedGradeLevel || filteredClassrooms.length === 0}
            itemToStringLabel={(value) => {
              const c = filteredClassrooms.find(c => c.id === value);
              return c ? `${t('classroom')} ${c.name}` : String(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={!selectedGradeLevel ? t('selectGradeFirst') : t('selectClassroom')} />
            </SelectTrigger>
            <SelectContent>
              {filteredClassrooms.map((c) => {
                const label = `${t('classroom')} ${c.name}`;
                return (
                  <SelectItem key={c.id} value={c.id} label={label}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {errors.classroom_id && <p className="text-xs text-destructive">{errors.classroom_id.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="class_number">{t('classNumber')}</Label>
        <Input
          id="class_number"
          type="number"
          min={1}
          max={50}
          {...register('class_number', { valueAsNumber: true })}
          placeholder={t('classNumberPlaceholder')}
        />
        {errors.class_number && <p className="text-xs text-destructive">{errors.class_number.message}</p>}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <div>
          <h3 className="text-sm font-medium">{t('guardianSection')}</h3>
          <p className="text-xs text-muted-foreground">{t('guardianDescription')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="guardian_full_name">{t('guardianName')}</Label>
            <Input id="guardian_full_name" {...register('guardian_full_name')} placeholder={t('guardianNamePlaceholder')} />
            {errors.guardian_full_name && <p className="text-xs text-destructive">{errors.guardian_full_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t('guardianRelation')}</Label>
            <Select
              value={guardianRelationValue}
              onValueChange={(v) => v && setValue('guardian_relation', v as StudentInput['guardian_relation'])}
              itemToStringLabel={(value) => guardianRelationLabels[value] || String(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(guardianRelationLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value} label={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="guardian_phone">{t('guardianPhone')}</Label>
          <Input id="guardian_phone" {...register('guardian_phone')} placeholder={t('guardianPhonePlaceholder')} />
          {errors.guardian_phone && <p className="text-xs text-destructive">{errors.guardian_phone.message}</p>}
        </div>
      </div>

      {defaultValues?.current_status && (
        <div className="space-y-2">
          <Label>{t('status')}</Label>
          <Select
            value={statusValue}
            onValueChange={(v) => v && setValue('current_status', v as StudentInput['current_status'])}
            itemToStringLabel={(value) => {
              const labels: Record<string, string> = { active: t('statusActive'), inactive: t('statusInactive'), transferred: t('statusTransferred'), graduated: t('statusGraduated'), suspended: t('statusSuspended') };
              return labels[value] || String(value);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active" label={t('statusActive')}>{t('statusActive')}</SelectItem>
              <SelectItem value="inactive" label={t('statusInactive')}>{t('statusInactive')}</SelectItem>
              <SelectItem value="transferred" label={t('statusTransferred')}>{t('statusTransferred')}</SelectItem>
              <SelectItem value="graduated" label={t('statusGraduated')}>{t('statusGraduated')}</SelectItem>
              <SelectItem value="suspended" label={t('statusSuspended')}>{t('statusSuspended')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {common('cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {defaultValues?.student_id_number ? common('save') : t('add')}
        </Button>
      </div>
    </form>
  );
}
