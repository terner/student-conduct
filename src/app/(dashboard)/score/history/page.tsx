'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScoreTransactionTable } from '@/components/features/scores/score-transaction-table';
import { getScores, getCategories } from '@/lib/actions/score.action';
import { getClassroomsForSelect } from '@/lib/actions/student.action';
import { getEducationStages } from '@/lib/actions/education-stage.action';
import type { ScoreTransactionWithDetails } from '@/lib/db/queries/score.queries';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

interface StageOption {
  id: string;
  name_th: string;
  code: string;
}

interface ClassroomOption {
  id: string;
  name: string;
  grade_level_id?: string;
  grade_level_name?: string;
  grade_level: number;
  education_stage_id: string;
}

interface CategoryOption {
  id: string;
  name: string;
  type: 'deduct' | 'add';
}

export default function ScoreHistoryPage() {
  const scoreT = useTranslations('score');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [data, setData] = useState<ScoreTransactionWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterStageId, setFilterStageId] = useState<string>('');
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterClassroom, setFilterClassroom] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const [stages, setStages] = useState<StageOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const getStageLabel = (stage: StageOption) => {
    if (stage.code === 'secondary') return 'มัธยมต้น';
    if (stage.code === 'highschool') return 'มัธยมปลาย';
    return stage.name_th;
  };

  // Load filter options
  useEffect(() => {
    Promise.all([
      getClassroomsForSelect(selectedAcademicYearId || undefined),
      getEducationStages(),
      getCategories(),
    ]).then(([classRes, stageRes, catRes]) => {
      if (classRes.success && classRes.data) setClassrooms(classRes.data);
      if (stageRes.success && stageRes.data) setStages(stageRes.data);
      if (catRes.success && catRes.data) setCategories(catRes.data as CategoryOption[]);
    });
  }, [selectedAcademicYearId]);

  const fetchData = useCallback(async (pageNum = 1, searchTerm = search) => {
    setLoading(true);
    const result = await getScores({
      page: pageNum,
      page_size: 20,
      search: searchTerm || undefined,
      classroom_id: filterClassroom || undefined,
      category_id: filterCategory || undefined,
      academic_year_id: selectedAcademicYearId || undefined,
    });
    if (result.success && result.data) {
      setData(result.data.data as unknown as ScoreTransactionWithDetails[]);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, [search, filterClassroom, filterCategory, selectedAcademicYearId]);

  useEffect(() => {
    setPage(1);
    fetchData(1, search);
  }, [filterClassroom, filterCategory, selectedAcademicYearId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived: filter classrooms by stage
  const stageClassrooms = useMemo(() => {
    if (!filterStageId) return classrooms;
    return classrooms.filter(c => c.education_stage_id === filterStageId);
  }, [classrooms, filterStageId]);

  // Derived: grade options from filtered classrooms
  const gradeOptions = useMemo(() => {
    const seen = new Map<string, { id: string; grade_level: number; label: string }>();
    stageClassrooms.forEach(c => {
      const key = c.grade_level_id || String(c.grade_level);
      if (!seen.has(key)) {
        seen.set(key, {
          id: c.grade_level_id || String(c.grade_level),
          grade_level: c.grade_level,
          label: c.grade_level_name || String(c.grade_level),
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.grade_level - b.grade_level);
  }, [stageClassrooms]);

  // Derived: classroom options filtered by grade
  const classroomOptions = useMemo(() => {
    let result = stageClassrooms;
    if (filterGrade) result = result.filter(c => c.grade_level_id ? c.grade_level_id === filterGrade : c.grade_level === Number(filterGrade));
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [stageClassrooms, filterGrade]);

  // Reset downstream filters when upstream changes
  useEffect(() => { setFilterGrade(''); setFilterClassroom(''); }, [filterStageId]);
  useEffect(() => { setFilterClassroom(''); }, [filterGrade]);

  // Validate grade is still in options
  useEffect(() => {
    if (!filterGrade) return;
    if (!gradeOptions.some(g => g.id === filterGrade)) {
      setFilterGrade('');
      setFilterClassroom('');
    }
  }, [filterGrade, gradeOptions]);

  // Validate classroom is still in options
  useEffect(() => {
    if (!filterClassroom) return;
    if (!classroomOptions.some(c => c.id === filterClassroom)) setFilterClassroom('');
  }, [filterClassroom, classroomOptions]);

  const hasFilters = filterStageId || filterGrade || filterClassroom || filterCategory;

  const clearFilters = () => {
    setSearch('');
    setFilterStageId('');
    setFilterGrade('');
    setFilterClassroom('');
    setFilterCategory('');
    setPage(1);
    fetchData(1, '');
  };

  const handleSearch = () => {
    setPage(1);
    fetchData(1, search);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{scoreT('historyTitle')}</h1>
          <p className="text-muted-foreground mt-1">{scoreT('historyDescription')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-md border bg-background p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={scoreT('searchStudentId')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="h-10 pl-9"
            />
          </div>

          {/* Stage */}
          <Select
            value={filterStageId || null}
            onValueChange={(v: string | null) => setFilterStageId(v || '')}
            itemToStringLabel={(value) => {
              const s = stages.find(s => s.id === value);
              return s ? getStageLabel(s) : String(value);
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={scoreT('allStages')} />
            </SelectTrigger>
            <SelectContent>
              {stages.map(s => (
                <SelectItem key={s.id} value={s.id} label={getStageLabel(s)}>
                  {getStageLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Grade */}
          <Select
            value={filterGrade || null}
            onValueChange={(v: string | null) => setFilterGrade(v || '')}
            disabled={!filterStageId}
            itemToStringLabel={(value) => {
              const g = gradeOptions.find(g => g.id === value);
              return g ? g.label : String(value);
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={scoreT('allGrades')} />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map(g => (
                <SelectItem key={g.id} value={g.id} label={g.label}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Classroom */}
          <Select
            value={filterClassroom || null}
            onValueChange={(v: string | null) => setFilterClassroom(v || '')}
            disabled={!filterGrade}
            itemToStringLabel={(value) => {
              const c = classroomOptions.find(c => c.id === value);
              return c ? c.name : String(value);
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={scoreT('allClassrooms')} />
            </SelectTrigger>
            <SelectContent>
              {classroomOptions.map(c => (
                <SelectItem key={c.id} value={c.id} label={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select
            value={filterCategory || null}
            onValueChange={(v: string | null) => setFilterCategory(v || '')}
            itemToStringLabel={(value) => {
              const c = categories.find(c => c.id === value);
              return c ? c.name : String(value);
            }}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={scoreT('allCategories')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id} label={c.name}>
                  <span className="flex items-center gap-1.5">
                    <span className={`inline-block size-1.5 rounded-full ${c.type === 'deduct' ? 'bg-red-500' : 'bg-green-500'}`} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear */}
          <Button type="button" variant="outline" onClick={clearFilters} disabled={!search && !hasFilters} className="h-10">
            <RotateCcw className="mr-2 h-4 w-4" />
            {commonT('clear')}
          </Button>
        </div>
      </div>

      {/* Search button */}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleSearch} className="h-9">
          <Search className="mr-2 h-4 w-4" />
          {commonT('search')}
        </Button>
      </div>

      {/* Results */}
      <Card>
        <CardContent className="pt-6">
          <ScoreTransactionTable
            data={data}
            loading={loading}
            total={total}
            page={page}
            pageSize={20}
            onPageChange={setPage}
            showActions={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
