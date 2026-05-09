'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { getStudentListForSelect, getClassroomsForSelect } from '@/lib/actions/student.action';
import { getEducationStages } from '@/lib/actions/education-stage.action';

interface StudentItem {
  id: string;
  student_id_number: string;
  full_name: string;
  classroom_name: string;
  grade_level: number;
  education_stage_id: string;
}

interface ClassroomOption {
  id: string;
  name: string;
  grade_level: number;
  education_stage_id: string;
}

interface StageOption {
  id: string;
  name_th: string;
  code: string;
}

export default function ScoreRecordPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [search, setSearch] = useState('');
  const [filterStageId, setFilterStageId] = useState<string>('');
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterClassroom, setFilterClassroom] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStudentListForSelect(),
      getClassroomsForSelect(),
      getEducationStages(),
    ]).then(([studentRes, classRes, stageRes]) => {
      if (studentRes.success && studentRes.data) setStudents(studentRes.data);
      if (classRes.success && classRes.data) setClassrooms(classRes.data);
      if (stageRes.success && stageRes.data) setStages(stageRes.data);
      setLoading(false);
    });
  }, []);

  // Stage name lookup
  const stageNameMap = useMemo(() => {
    const map = new Map<string, string>();
    stages.forEach(s => map.set(s.id, s.name_th));
    return map;
  }, [stages]);

  // Derived grade options from classroom data
  const gradeOptions = useMemo(() => {
    const seen = new Map<string, { grade_level: number; education_stage_id: string; label: string }>();
    classrooms.forEach(c => {
      const key = `${c.education_stage_id}-${c.grade_level}`;
      if (!seen.has(key)) {
        const stageName = stageNameMap.get(c.education_stage_id) || '';
        const isSecondary = stages.find(s => s.id === c.education_stage_id)?.code === 'secondary';
        const gradeLabel = isSecondary ? `ม.${c.grade_level - 6}` : `${stageName}${c.grade_level}`;
        seen.set(key, {
          grade_level: c.grade_level,
          education_stage_id: c.education_stage_id,
          label: gradeLabel,
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.grade_level - b.grade_level);
  }, [classrooms, stageNameMap, stages]);

  // Filter students
  const filtered = useMemo(() => {
    let result = students;
    if (search) {
      result = result.filter(s =>
        s.full_name.includes(search) || s.student_id_number.includes(search)
      );
    }
    if (filterStageId) result = result.filter(s => s.education_stage_id === filterStageId);
    if (filterGrade) result = result.filter(s => s.grade_level === Number(filterGrade));
    if (filterClassroom) result = result.filter(s => s.classroom_name === filterClassroom);
    return result;
  }, [students, search, filterStageId, filterGrade, filterClassroom]);

  const hasFilters = filterStageId || filterGrade || filterClassroom;

  const clearFilters = () => {
    setFilterStageId('');
    setFilterGrade('');
    setFilterClassroom('');
  };

  // Helper to get classroom options filtered by current stage/grade
  const classroomOptions = useMemo(() => {
    let result = classrooms;
    if (filterStageId) result = result.filter(c => c.education_stage_id === filterStageId);
    if (filterGrade) result = result.filter(c => c.grade_level === Number(filterGrade));
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms, filterStageId, filterGrade]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">บันทึกคะแนน</h1>
        <p className="text-muted-foreground mt-1">ค้นหานักเรียนเพื่อบันทึกคะแนนความประพฤติ</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-11"
          autoFocus
        />
      </div>

      {/* Inline Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">ตัวกรอง</p>
            {hasFilters && (
              <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                ล้างทั้งหมด
              </button>
            )}
          </div>

          <div className="space-y-3">
            <Select value={filterStageId || null} onValueChange={(v: string | null) => { setFilterStageId(v || ''); setFilterGrade(''); setFilterClassroom(''); }}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="ทุกระดับ" />
              </SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.id} value={s.id} label={s.name_th}>
                    {s.name_th}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterGrade || null} onValueChange={(v: string | null) => { setFilterGrade(v || ''); setFilterClassroom(''); }}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="ทุกชั้นปี" />
              </SelectTrigger>
              <SelectContent>
                {gradeOptions.map(g => (
                  <SelectItem key={g.label} value={String(g.grade_level)} label={g.label}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterClassroom || null} onValueChange={(v: string | null) => setFilterClassroom(v || '')}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="ทุกห้อง" />
              </SelectTrigger>
              <SelectContent>
                {classroomOptions.map(c => (
                  <SelectItem key={c.id} value={c.name} label={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active filter badges */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {filterStageId && (
                <Badge key="stage" variant="secondary" className="text-sm px-3 py-1">
                  {stageNameMap.get(filterStageId) || filterStageId}
                </Badge>
              )}
              {filterGrade && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {gradeOptions.find(g => String(g.grade_level) === filterGrade)?.label}
                </Badge>
              )}
              {filterClassroom && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {filterClassroom}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mb-2" />
          <p>{search || hasFilters ? 'ไม่พบนักเรียนที่ค้นหา' : 'ยังไม่มีข้อมูลนักเรียน'}</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            พบ {filtered.length} คน
            {hasFilters && ` (จากทั้งหมด ${students.length} คน)`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 50).map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => router.push(`/students/${s.id}`)}
                className="flex items-start gap-3 rounded-lg border p-4 text-left hover:bg-accent hover:border-primary/50 transition-all"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{s.full_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">{s.student_id_number}</span>
                    <span>{s.classroom_name}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
