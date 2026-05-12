'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getClassroomsForSelect } from '@/lib/actions/student.action';
import { getEducationStages } from '@/lib/actions/education-stage.action';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

interface StageOption {
  id: string;
  name_th: string;
  code: string;
}

interface StudentSearchProps {
  onSearch: (params: { search?: string; classroom_id?: string; grade_level_id?: string; grade_level?: string; education_stage_id?: string; status?: string; academic_year?: string }) => void;
  classrooms?: { id: string; name: string; grade_level_id?: string; grade_level_name?: string; grade_level: number; education_stage_id?: string; academic_year_id?: string }[];
  academicYears?: { id: string; name: string; is_current: boolean }[];
}

interface ClassroomOption {
  id: string;
  name: string;
  grade_level_id?: string;
  grade_level_name?: string;
  grade_level: number;
  education_stage_id: string;
}

export function StudentSearch({ onSearch, classrooms: propClassrooms }: StudentSearchProps) {
  const t = useTranslations('student');
  const common = useTranslations('common');
  const [search, setSearch] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [stageFilterId, setStageFilterId] = useState('');
  const [status, setStatus] = useState('');
  const [stages, setStages] = useState<StageOption[]>([]);
  const selectedYearId = useSelectedAcademicYearId();
  const [filteredClassrooms, setFilteredClassrooms] = useState<ClassroomOption[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const lastSubmittedParams = useRef('');

  // Load academic years and stages on mount
  useEffect(() => {
    getEducationStages().then((stageRes) => {
      if (stageRes.success && stageRes.data) {
        setStages(stageRes.data);
      }
    });
  }, []);

  // Load classrooms when year changes
  useEffect(() => {
    if (!selectedYearId) return;
    setLoadingClassrooms(true);
    getClassroomsForSelect(selectedYearId).then((res) => {
      if (res.success && res.data) {
        setFilteredClassrooms(res.data);
      }
    }).finally(() => setLoadingClassrooms(false));
  }, [selectedYearId]);

  // Stage name lookup
  const stageNameMap = new Map<string, string>();
  stages.forEach(s => stageNameMap.set(s.id, s.name_th));
  const getGradeLabelFromClassroomName = (name: string, fallbackGrade: number) => {
    const baseName = name.split('/')[0]?.trim();
    return baseName || String(fallbackGrade);
  };

  // If classrooms provided via props, use those (filtered by year)
  const yearClassrooms = (propClassrooms && propClassrooms.length > 0
    ? propClassrooms.filter(c => !selectedYearId || c.academic_year_id === selectedYearId)
    : filteredClassrooms
  ).filter(c => {
    if (stageFilterId && c.education_stage_id !== stageFilterId) return false;
    return true;
  });

  const displayClassrooms = yearClassrooms.filter(c => {
    if (gradeLevel) {
      if (c.grade_level_id ? c.grade_level_id !== gradeLevel : String(c.grade_level) !== gradeLevel) return false;
    }
    return true;
  });

  const buildSearchParams = useCallback(() => ({
      search: search.trim() || undefined,
      classroom_id: classroomId || undefined,
      grade_level_id: gradeLevel && gradeLevel.includes('-') ? gradeLevel : undefined,
      grade_level: gradeLevel && !gradeLevel.includes('-') ? gradeLevel : undefined,
      education_stage_id: stageFilterId || undefined,
      status: status || undefined,
      academic_year: selectedYearId || undefined,
    }), [search, classroomId, gradeLevel, stageFilterId, status, selectedYearId]);

  const submitSearch = useCallback((params: ReturnType<typeof buildSearchParams>) => {
    const normalized = JSON.stringify(params);
    if (normalized === lastSubmittedParams.current) return;
    lastSubmittedParams.current = normalized;
    onSearch(params);
  }, [onSearch, buildSearchParams]);

  const handleSearch = useCallback(() => {
    submitSearch(buildSearchParams());
  }, [buildSearchParams, submitSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      submitSearch(buildSearchParams());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [buildSearchParams, submitSearch]);

  const handleClear = useCallback(() => {
    setSearch('');
    setClassroomId('');
    setGradeLevel('');
    setStageFilterId('');
    setStatus('');
    lastSubmittedParams.current = '';
    onSearch({});
  }, [onSearch]);

  // Unique grade levels from classrooms for the grade select
  const gradeOptions = yearClassrooms
    .map(c => ({
      id: c.grade_level_id || String(c.grade_level),
      grade_level: c.grade_level,
      education_stage_id: c.education_stage_id,
      label: c.grade_level_name || getGradeLabelFromClassroomName(c.name, c.grade_level),
    }))
    .filter((v, i, a) => a.findIndex(x => x.id === v.id && x.education_stage_id === v.education_stage_id) === i)
    .sort((a, b) => a.grade_level - b.grade_level);

  useEffect(() => {
    if (!gradeLevel) return;
    const isValidGrade = gradeOptions.some(g => g.id === gradeLevel);
    if (!isValidGrade) {
      setGradeLevel('');
      setClassroomId('');
    }
  }, [gradeLevel, gradeOptions]);

  useEffect(() => {
    if (!classroomId) return;
    const isValidClassroom = displayClassrooms.some(c => c.id === classroomId);
    if (!isValidClassroom) setClassroomId('');
  }, [classroomId, displayClassrooms]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchByIdOrName')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="pl-9"
        />
      </div>

      {/* Education Stage Filter (dynamic from master data) */}
      <div className="w-[140px]">
        <Select value={stageFilterId} onValueChange={(v) => v !== null && (setStageFilterId(v), setGradeLevel(''), setClassroomId(''))}
          itemToStringLabel={(value) => {
            if (!value) return common('all');
            return stageNameMap.get(value) || String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('stage')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{common('all')}</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id} label={s.name_th}>
                {s.name_th}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grade Level (derived from filtered classrooms) */}
      <div className="w-[120px]">
        <Select value={gradeLevel} onValueChange={(v) => v !== null && (setGradeLevel(v), setClassroomId(''))}
          itemToStringLabel={(value) => {
            if (!value) return common('all');
            const selected = gradeOptions.find(g => g.id === value);
            return selected ? selected.label : String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('gradeLevel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{common('all')}</SelectItem>
            {gradeOptions.map((g) => (
              <SelectItem key={`${g.education_stage_id}-${g.id}`} value={g.id} label={g.label}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Classroom */}
      <div className="w-[160px]">
        <Select
          value={classroomId}
          onValueChange={(v) => v !== null && setClassroomId(v)}
          disabled={!selectedYearId || loadingClassrooms}
          itemToStringLabel={(value) => {
            if (!value) return common('all');
            const c = displayClassrooms.find(c => c.id === value);
            return c ? c.name : String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingClassrooms ? common('loading') : t('classroomFull')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{common('all')}</SelectItem>
            {displayClassrooms.map((c) => (
              <SelectItem key={c.id} value={c.id} label={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="w-[120px]">
        <Select value={status} onValueChange={(v) => v !== null && setStatus(v)}
          itemToStringLabel={(value) => {
            const labels: Record<string, string> = { '': common('all'), active: t('statusActive'), inactive: t('statusInactive'), transferred: t('statusTransferred'), graduated: t('statusGraduated'), suspended: t('statusSuspended') };
            return labels[value] || String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{common('all')}</SelectItem>
            <SelectItem value="active" label={t('statusActive')}>{t('statusActive')}</SelectItem>
            <SelectItem value="inactive" label={t('statusInactive')}>{t('statusInactive')}</SelectItem>
            <SelectItem value="transferred" label={t('statusTransferred')}>{t('statusTransferred')}</SelectItem>
            <SelectItem value="graduated" label={t('statusGraduated')}>{t('statusGraduated')}</SelectItem>
            <SelectItem value="suspended" label={t('statusSuspended')}>{t('statusSuspended')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSearch}>{common('search')}</Button>
      <Button variant="ghost" size="icon" onClick={handleClear} title={common('clear')}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
