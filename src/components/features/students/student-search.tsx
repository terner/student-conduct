'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { RotateCcw, Search } from 'lucide-react';
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
  onSearch: (params: { search?: string; classroom_id?: string; grade_level_id?: string; grade_level?: string; education_stage_id?: string; academic_year?: string }) => void;
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
  const [stages, setStages] = useState<StageOption[]>([]);
  const selectedYearId = useSelectedAcademicYearId();
  const [filteredClassrooms, setFilteredClassrooms] = useState<ClassroomOption[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const lastSubmittedParams = useRef('');
  const getStageLabel = (stage: StageOption) => {
    if (stage.code === 'secondary') return 'มัธยมต้น';
    if (stage.code === 'highschool') return 'มัธยมปลาย';
    return stage.name_th;
  };

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
    void Promise.resolve().then(() => setLoadingClassrooms(true));
    void getClassroomsForSelect(selectedYearId).then((res) => {
      if (res.success && res.data) {
        setFilteredClassrooms(res.data);
      }
    }).finally(() => {
      void Promise.resolve().then(() => setLoadingClassrooms(false));
    });
  }, [selectedYearId]);

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
      academic_year: selectedYearId || undefined,
    }), [search, classroomId, gradeLevel, stageFilterId, selectedYearId]);

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
    lastSubmittedParams.current = '';
    onSearch({});
  }, [onSearch]);

  const hasFilters = Boolean(search.trim() || stageFilterId || gradeLevel || classroomId);

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
      void Promise.resolve().then(() => {
        setGradeLevel('');
        setClassroomId('');
      });
    }
  }, [gradeLevel, gradeOptions]);

  useEffect(() => {
    if (!classroomId) return;
    const isValidClassroom = displayClassrooms.some(c => c.id === classroomId);
    if (!isValidClassroom) {
      void Promise.resolve().then(() => setClassroomId(''));
    }
  }, [classroomId, displayClassrooms]);

  return (
    <div className="rounded-md border bg-background p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchByIdOrName')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-10 pl-9"
          />
        </div>

        <div>
          <Select
            value={stageFilterId || null}
            onValueChange={(v) => setStageFilterId(v || '')}
            itemToStringLabel={(value) => {
              const stage = stages.find((item) => item.id === value);
              return stage ? getStageLabel(stage) : '';
            }}
          >
            <SelectTrigger className="!h-10 w-full">
              <SelectValue placeholder={t('allStages')} />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id} label={getStageLabel(s)}>
                  {getStageLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={gradeLevel || null}
            onValueChange={(v) => setGradeLevel(v || '')}
            itemToStringLabel={(value) => {
              const selected = gradeOptions.find(g => g.id === value);
              return selected ? selected.label : String(value);
            }}
          >
            <SelectTrigger className="!h-10 w-full">
              <SelectValue placeholder={t('allGrades')} />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((g) => (
                <SelectItem key={`${g.education_stage_id}-${g.id}`} value={g.id} label={g.label}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select
            value={classroomId || null}
            onValueChange={(v) => setClassroomId(v || '')}
            disabled={!selectedYearId || loadingClassrooms}
            itemToStringLabel={(value) => {
              const c = displayClassrooms.find(c => c.id === value);
              return c ? c.name : String(value);
            }}
          >
            <SelectTrigger className="!h-10 w-full">
              <SelectValue placeholder={loadingClassrooms ? common('loading') : t('allClassrooms')} />
            </SelectTrigger>
            <SelectContent>
              {displayClassrooms.map((c) => (
                <SelectItem key={c.id} value={c.id} label={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="outline" onClick={handleClear} disabled={!hasFilters} className="h-10">
          <RotateCcw className="mr-2 h-4 w-4" />
          {common('clear')}
        </Button>
      </div>
    </div>
  );
}
