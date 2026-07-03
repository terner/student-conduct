'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getStudentListForSelect, getClassroomsForSelect } from '@/lib/actions/student.action';
import { getEducationStages } from '@/lib/actions/education-stage.action';
import { getScoreRecordingAvailability } from '@/lib/actions/score.action';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

interface StudentItem {
  id: string;
  student_id_number: string;
  full_name: string;
  classroom_id: string;
  classroom_name: string;
  grade_level_id?: string;
  grade_level_name?: string;
  grade_level: number;
  education_stage_id: string;
}

interface ClassroomOption {
  id: string;
  name: string;
  grade_level_id?: string;
  grade_level_name?: string;
  grade_level: number;
  education_stage_id: string;
}

interface StageOption {
  id: string;
  name_th: string;
  code: string;
}

const SCORE_RECORD_CACHE_TTL_MS = 15 * 1000;
const SCORE_RECORD_CACHE_VERSION = 2;

interface ScoreRecordPageCache {
  version: number;
  savedAt: number;
  students: StudentItem[];
  classrooms: ClassroomOption[];
  stages: StageOption[];
}

export default function ScoreRecordPage() {
  const t = useTranslations('score');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const router = useRouter();
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [search, setSearch] = useState('');
  const [filterStageId, setFilterStageId] = useState<string>('');
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterClassroom, setFilterClassroom] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [loading, setLoading] = useState(true);
  const [recordingClosedReason, setRecordingClosedReason] = useState('');
  const getStageLabel = (stage: StageOption) => {
    if (stage.code === 'secondary') return t('secondaryStage');
    if (stage.code === 'highschool') return t('highschoolStage');
    return stage.name_th;
  };

  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      setLoading(true);
      setRecordingClosedReason('');

      const availability = await getScoreRecordingAvailability(selectedAcademicYearId || undefined);
      if (cancelled) return;
      if (!availability.success || !availability.data?.can_record) {
        setStudents([]);
        setClassrooms([]);
        setStages([]);
        setRecordingClosedReason(availability.success ? availability.data?.reason || t('currentYearOnly') : availability.error.message);
        setLoading(false);
        return;
      }

      const cachePrefix = `score-record-options:v`;
      const cacheKey = `${cachePrefix}${SCORE_RECORD_CACHE_VERSION}:${selectedAcademicYearId || 'current'}`;

      // Clean up stale cache entries from old versions or other years
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith(cachePrefix) && key !== cacheKey) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch { /* ignore cleanup errors */ }

      try {
        const raw = sessionStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw) as ScoreRecordPageCache;
          const age = Date.now() - cached.savedAt;
          if (
            cached.version === SCORE_RECORD_CACHE_VERSION &&
            age < SCORE_RECORD_CACHE_TTL_MS
          ) {
            setStudents(cached.students);
            setClassrooms(cached.classrooms);
            setStages(cached.stages);
            setLoading(false);
            return;
          }
          sessionStorage.removeItem(cacheKey);
        }
      } catch (e) {
        sessionStorage.removeItem(cacheKey);
      }

      Promise.all([
        getStudentListForSelect(selectedAcademicYearId || undefined),
        getClassroomsForSelect(selectedAcademicYearId || undefined),
        getEducationStages(),
      ]).then(([studentRes, classRes, stageRes]) => {
        if (cancelled) return;
        const nextStudents = studentRes.success && studentRes.data ? studentRes.data : [];
        const nextClassrooms = classRes.success && classRes.data ? classRes.data : [];
        const nextStages = stageRes.success && stageRes.data ? stageRes.data : [];


        if (studentRes.success && studentRes.data) setStudents(nextStudents);
        if (classRes.success && classRes.data) setClassrooms(nextClassrooms);
        if (stageRes.success && stageRes.data) setStages(nextStages);

        if (studentRes.success && classRes.success && stageRes.success) {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            version: SCORE_RECORD_CACHE_VERSION,
            savedAt: Date.now(),
            students: nextStudents,
            classrooms: nextClassrooms,
            stages: nextStages,
          } satisfies ScoreRecordPageCache));
        }
        setLoading(false);
      }).catch((err) => {
        if (!cancelled) setLoading(false);
      });
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [selectedAcademicYearId]);

  const getGradeLabelFromClassroomName = (name: string, fallbackGrade: number) => {
    const baseName = name.split('/')[0]?.trim();
    return baseName || String(fallbackGrade);
  };

  const stageClassrooms = useMemo(() => {
    if (!filterStageId) return classrooms;
    return classrooms.filter(c => c.education_stage_id === filterStageId);
  }, [classrooms, filterStageId]);

  // Derived grade options from classroom data
  const gradeOptions = useMemo(() => {
    const seen = new Map<string, { id: string; grade_level: number; education_stage_id: string; label: string }>();
    stageClassrooms.forEach(c => {
      const key = `${c.education_stage_id}-${c.grade_level_id || c.grade_level}`;
      if (!seen.has(key)) {
        seen.set(key, {
          id: c.grade_level_id || String(c.grade_level),
          grade_level: c.grade_level,
          education_stage_id: c.education_stage_id,
          label: c.grade_level_name || getGradeLabelFromClassroomName(c.name, c.grade_level),
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.grade_level - b.grade_level);
  }, [stageClassrooms]);

  // Filter students
  const filtered = useMemo(() => {
    let result = students;
    if (search) {
      result = result.filter(s =>
        s.full_name.includes(search) || s.student_id_number.includes(search)
      );
    }
    if (filterStageId) result = result.filter(s => s.education_stage_id === filterStageId);
    if (filterGrade) result = result.filter(s => s.grade_level_id ? s.grade_level_id === filterGrade : s.grade_level === Number(filterGrade));
    if (filterClassroom) result = result.filter(s => s.classroom_id === filterClassroom);
    return result;
  }, [students, search, filterStageId, filterGrade, filterClassroom]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length]);
  const pagedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  // Reset to page 1 when filters change
  const prevFilterKey = useMemo(() => `${search}|${filterStageId}|${filterGrade}|${filterClassroom}`, [search, filterStageId, filterGrade, filterClassroom]);
  useEffect(() => {
    void Promise.resolve().then(() => setPage(1));
  }, [prevFilterKey]);

  const hasFilters = filterStageId || filterGrade || filterClassroom;

  useEffect(() => {
    if (!filterGrade) return;
    const isValidGrade = gradeOptions.some(g => g.id === filterGrade);
    if (!isValidGrade) {
      void Promise.resolve().then(() => {
        setFilterGrade('');
        setFilterClassroom('');
      });
    }
  }, [filterGrade, gradeOptions]);

  const clearFilters = () => {
    setSearch('');
    setFilterStageId('');
    setFilterGrade('');
    setFilterClassroom('');
  };

  // Helper to get classroom options filtered by current stage/grade
  const classroomOptions = useMemo(() => {
    let result = stageClassrooms;
    if (filterGrade) result = result.filter(c => c.grade_level_id ? c.grade_level_id === filterGrade : c.grade_level === Number(filterGrade));
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [stageClassrooms, filterGrade]);

  useEffect(() => {
    if (!filterClassroom) return;
    const isValidClassroom = classroomOptions.some(c => c.id === filterClassroom);
    if (!isValidClassroom) {
      void Promise.resolve().then(() => setFilterClassroom(''));
    }
  }, [filterClassroom, classroomOptions]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('recordTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('recordDescription')}</p>
      </div>

      {recordingClosedReason && (
        <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
          <div>
            <p className="font-medium">{t('selectedYearClosedTitle')}</p>
            <p className="text-amber-800 dark:text-amber-200">{recordingClosedReason}</p>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-background p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1.5fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('searchStudent')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 pl-9"
              autoFocus
            />
          </div>

          <div>
            <Select
              value={filterStageId || null}
              onValueChange={(v: string | null) => setFilterStageId(v || '')}
              itemToStringLabel={(value) => {
                const s = stages.find(s => s.id === value);
                return s ? getStageLabel(s) : '';
              }}
            >
              <SelectTrigger className="!h-10 w-full">
                <SelectValue placeholder={t('allStages')} />
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.id} value={s.id} label={getStageLabel(s)}>
                    {getStageLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={filterGrade || null}
              onValueChange={(v: string | null) => setFilterGrade(v || '')}
              itemToStringLabel={(value) => {
                const g = gradeOptions.find(g => g.id === value);
                return g ? g.label : '';
              }}
            >
              <SelectTrigger className="!h-10 w-full">
                <SelectValue placeholder={t('allGrades')} />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map(g => (
                  <SelectItem key={g.id} value={g.id} label={g.label}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={filterClassroom || null}
              onValueChange={(v: string | null) => setFilterClassroom(v || '')}
              itemToStringLabel={(value) => {
                const c = classroomOptions.find(c => c.id === value);
                return c ? c.name : '';
              }}
            >
              <SelectTrigger className="!h-10 w-full">
                <SelectValue placeholder={t('allClassrooms')} />
              </SelectTrigger>
              <SelectContent>
                {classroomOptions.map(c => (
                  <SelectItem key={c.id} value={c.id} label={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" variant="outline" onClick={clearFilters} disabled={!search && !hasFilters} className="h-10">
            <RotateCcw className="mr-2 h-4 w-4" />
            {commonT('clear')}
          </Button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mb-2" />
          <p>{search || hasFilters ? t('noStudentsFiltered') : t('noStudents')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('recordResultsSummary', {
                total: students.length,
                from: pageSize * (page - 1) + 1,
                to: Math.min(page * pageSize, filtered.length),
                filtered: filtered.length,
              })}
              {(search || hasFilters) && t('recordResultsFilteredSuffix', { total: students.length })}
            </p>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">{studentT('id')}</TableHead>
                  <TableHead>{studentT('fullName')}</TableHead>
                  <TableHead className="w-[120px]">{studentT('classroom')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStudents.map(s => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/students/${s.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{s.student_id_number}</TableCell>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell>{s.classroom_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {commonT('previous')}
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                {commonT('next')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
