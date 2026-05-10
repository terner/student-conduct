'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownUp, Download, Eye, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getStudentRankingReport, type RankingSortBy, type StudentRankingRow } from '@/lib/actions/report.action';
import { getAcademicYears, getClassroomsForSelect } from '@/lib/actions/student.action';
import { exportCsv } from '@/lib/utils/csv';

interface AcademicYearOption {
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
}

type TableSortBy = RankingSortBy | 'rank' | 'classroom' | 'status';
type SortDirection = 'asc' | 'desc';
type RankMode = 'risk' | 'score';

const sortOptions: Array<{ value: TableSortBy; label: string }> = [
  { value: 'rank', label: 'อันดับ' },
  { value: 'current_score', label: 'คะแนนต่ำสุด' },
  { value: 'deducted', label: 'หักสะสมมากสุด' },
  { value: 'transaction_count', label: 'บันทึกบ่อยสุด' },
  { value: 'latest', label: 'ล่าสุด' },
  { value: 'name', label: 'ชื่อ' },
];
const serverSortValues: TableSortBy[] = ['current_score', 'deducted', 'transaction_count', 'latest', 'name'];

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatGradeLabel(classroom: ClassroomOption) {
  if (classroom.grade_level_name) return classroom.grade_level_name;
  const baseName = classroom.name.split('/')[0]?.trim();
  return baseName || String(classroom.grade_level);
}

function statusLabel(row: StudentRankingRow, baseScore: number) {
  if (row.current_score < baseScore - 40 || row.total_deducted >= 40) return { label: 'เสี่ยงสูง', variant: 'destructive' as const };
  if (row.current_score < baseScore - 20 || row.total_deducted >= 20) return { label: 'เฝ้าระวัง', variant: 'secondary' as const };
  return { label: 'ปกติ', variant: 'outline' as const };
}

function defaultDirection(sortBy: TableSortBy): SortDirection {
  if (sortBy === 'current_score' || sortBy === 'rank' || sortBy === 'name' || sortBy === 'classroom') return 'asc';
  return 'desc';
}

function defaultScoreDirection(rankMode: RankMode): SortDirection {
  return rankMode === 'risk' ? 'asc' : 'desc';
}

function statusWeight(row: StudentRankingRow, baseScore: number) {
  if (row.current_score < baseScore - 40 || row.total_deducted >= 40) return 3;
  if (row.current_score < baseScore - 20 || row.total_deducted >= 20) return 2;
  return 1;
}

function SortHeader({
  label,
  value,
  active,
  direction,
  onSort,
  className = '',
}: {
  label: string;
  value: TableSortBy;
  active: boolean;
  direction: SortDirection;
  onSort: (value: TableSortBy) => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={`h-7 px-1.5 text-xs font-semibold ${className}`}
      onClick={() => onSort(value)}
    >
      {label}
      <ArrowDownUp className={`ml-1 h-3.5 w-3.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`} />
      {active && <span className="ml-0.5 text-[10px] text-muted-foreground">{direction === 'asc' ? 'ขึ้น' : 'ลง'}</span>}
    </Button>
  );
}

export default function IndividualReportPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState<TableSortBy>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [rankMode, setRankMode] = useState<RankMode>('risk');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentRankingRow | null>(null);

  useEffect(() => {
    async function loadOptions() {
      const yearRes = await getAcademicYears();

      if (yearRes.success && yearRes.data) {
        const years = yearRes.data as AcademicYearOption[];
        setAcademicYears(years);
        const current = years.find((year) => year.is_current) || years[0];
        if (current) setAcademicYearId(current.id);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    async function loadClassrooms() {
      if (!academicYearId) return;
      const classroomRes = await getClassroomsForSelect(academicYearId);
      if (classroomRes.success && classroomRes.data) {
        setClassrooms(classroomRes.data as ClassroomOption[]);
        setGradeId('');
        setClassroomName('');
      }
    }
    loadClassrooms();
  }, [academicYearId]);

  const gradeOptions = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; grade_level: number }>();
    classrooms.forEach((classroom) => {
      const id = classroom.grade_level_id || String(classroom.grade_level);
      if (!seen.has(id)) {
        seen.set(id, {
          id,
          label: formatGradeLabel(classroom),
          grade_level: classroom.grade_level,
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.grade_level - b.grade_level);
  }, [classrooms]);

  const classroomOptions = useMemo(() => {
    let result = classrooms;
    if (gradeId) {
      result = result.filter((classroom) => (
        classroom.grade_level_id ? classroom.grade_level_id === gradeId : String(classroom.grade_level) === gradeId
      ));
    }
    return [...result].sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms, gradeId]);

  async function loadReport() {
    setLoading(true);
    const result = await getStudentRankingReport({
      academic_year_id: academicYearId || undefined,
      grade_level_id: gradeId || undefined,
      classroom_name: classroomName || undefined,
      search: search || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      sort_by: serverSortValues.includes(sortBy) ? sortBy as RankingSortBy : 'current_score',
      rank_mode: rankMode,
    });
    if (result.success) {
      setReportData(result.data);
      setSelectedStudent(null);
    }
    setLoading(false);
  }

  const autoLoadKey = `${academicYearId}:${rankMode}`;

  useEffect(() => {
    if (!academicYearId) return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadKey]);

  function applyFilters() {
    loadReport();
  }

  function clearFilters() {
    setGradeId('');
    setClassroomName('');
    setSearch('');
    setFromDate('');
    setToDate('');
    setSortBy('rank');
    setSortDirection('asc');
    setRankMode('risk');
  }

  function handleSort(value: TableSortBy) {
    if (sortBy === value) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(value);
    setSortDirection(defaultDirection(value));
  }

  function handleExport() {
    if (!reportData?.rows) return;
    exportCsv(displayedRows.map((row: StudentRankingRow) => ({
      อันดับรวม: row.rank_overall,
      อันดับห้อง: row.rank_classroom,
      อันดับชั้นปี: row.rank_grade,
      รหัสนักเรียน: row.student_id_number,
      ชื่อ: row.full_name,
      ห้อง: row.classroom_name,
      คะแนนปัจจุบัน: row.current_score,
      หักสะสม: row.total_deducted,
      เพิ่มสะสม: row.total_added,
      จำนวนรายการ: row.transaction_count,
      บันทึกล่าสุด: row.latest_recorded_at ? formatDateTime(row.latest_recorded_at) : '',
    })), `student_ranking_${reportData.academic_year || 'report'}`);
  }

  const rows = (reportData?.rows || []) as StudentRankingRow[];
  const summary = reportData?.summary;
  const baseScore = reportData?.base_score || 100;
  const displayedRows = useMemo(() => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let result = 0;
      if (sortBy === 'rank') result = a.rank_overall - b.rank_overall;
      else if (sortBy === 'name') result = a.full_name.localeCompare(b.full_name);
      else if (sortBy === 'classroom') result = a.classroom_name.localeCompare(b.classroom_name) || a.full_name.localeCompare(b.full_name);
      else if (sortBy === 'current_score') result = a.current_score - b.current_score || b.total_deducted - a.total_deducted;
      else if (sortBy === 'deducted') result = a.total_deducted - b.total_deducted;
      else if (sortBy === 'transaction_count') result = a.transaction_count - b.transaction_count;
      else if (sortBy === 'latest') result = (a.latest_recorded_at || '').localeCompare(b.latest_recorded_at || '');
      else if (sortBy === 'status') result = statusWeight(a, baseScore) - statusWeight(b, baseScore);
      return result * multiplier || a.full_name.localeCompare(b.full_name);
    });
  }, [baseScore, rows, sortBy, sortDirection]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายงานอันดับนักเรียน</h1>
          <p className="text-muted-foreground mt-1">ดูประวัติรายคน รายห้อง รายชั้นปี และจัดอันดับตามปีการศึกษา</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={displayedRows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      <div className="rounded-md border bg-background p-4">
        <div className="grid gap-3 lg:grid-cols-[160px_150px_150px_minmax(200px,1fr)_140px_140px_150px_170px_auto_auto]">
          <Select
            value={academicYearId || null}
            onValueChange={(value: string | null) => setAcademicYearId(value || '')}
            itemToStringLabel={(value) => academicYears.find((year) => year.id === value)?.name || String(value)}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="ปีการศึกษา" />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id} label={year.name}>
                  {year.name}{year.is_current ? ' (ปัจจุบัน)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={gradeId || null}
            onValueChange={(value: string | null) => {
              setGradeId(value || '');
              setClassroomName('');
            }}
            itemToStringLabel={(value) => gradeOptions.find((grade) => grade.id === value)?.label || String(value)}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="ทุกชั้นปี" />
            </SelectTrigger>
            <SelectContent>
              {gradeOptions.map((grade) => (
                <SelectItem key={grade.id} value={grade.id} label={grade.label}>
                  {grade.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={classroomName || null}
            onValueChange={(value: string | null) => setClassroomName(value || '')}
            itemToStringLabel={(value) => classroomOptions.find((classroom) => classroom.name === value)?.name || String(value)}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="ทุกห้อง" />
            </SelectTrigger>
            <SelectContent>
              {classroomOptions.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.name} label={classroom.name}>
                  {classroom.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && applyFilters()}
              placeholder="ค้นหาชื่อหรือรหัสนักเรียน"
              className="h-10 pl-9"
            />
          </div>

          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10" />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="h-10" />

          <Select
            value={rankMode}
            onValueChange={(value: RankMode | null) => {
              setRankMode(value || 'risk');
              setSortBy('rank');
              setSortDirection('asc');
            }}
            itemToStringLabel={(value) => value === 'score' ? 'คะแนนดีสุด' : 'เฝ้าระวัง'}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="รูปแบบอันดับ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk" label="เฝ้าระวัง">เฝ้าระวัง</SelectItem>
              <SelectItem value="score" label="คะแนนดีสุด">คะแนนดีสุด</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortOptions.some((option) => option.value === sortBy) ? sortBy : null}
            onValueChange={(value: TableSortBy | null) => {
              const next = value || 'current_score';
              setSortBy(next);
              setSortDirection(next === 'current_score' ? defaultScoreDirection(rankMode) : defaultDirection(next));
            }}
            itemToStringLabel={(value) => sortOptions.find((item) => item.value === value)?.label || String(value)}
          >
            <SelectTrigger className="h-10 w-full">
              <ArrowDownUp className="mr-1 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="เรียงตาม" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((item) => (
                <SelectItem key={item.value} value={item.value} label={item.label}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={applyFilters} disabled={loading} className="h-10">
            ค้นหา
          </Button>
          <Button variant="outline" onClick={clearFilters} disabled={loading} className="h-10">
            <X className="mr-2 h-4 w-4" />
            ล้าง
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">นักเรียน</p><p className="text-2xl font-bold">{summary.total_students}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">คะแนนเฉลี่ย</p><p className="text-2xl font-bold">{summary.average_score}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">ต่ำสุด</p><p className="text-2xl font-bold text-destructive">{summary.min_score}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">สูงสุด</p><p className="text-2xl font-bold text-emerald-600">{summary.max_score}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">หักรวม</p><p className="text-2xl font-bold">{summary.total_deducted}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">เฝ้าระวัง</p><p className="text-2xl font-bold text-amber-600">{summary.at_risk_count}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Ranking ปีการศึกษา {reportData?.academic_year || '-'}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {rankMode === 'risk'
                ? 'อันดับเฝ้าระวัง: คะแนนต่ำสุดเป็นอันดับ 1'
                : 'อันดับคะแนนดี: คะแนนสูงสุดเป็นอันดับ 1'}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="size-8" /></div>
          ) : displayedRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">ไม่พบข้อมูลตามตัวกรอง</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">
                    <SortHeader label="อันดับ" value="rank" active={sortBy === 'rank'} direction={sortDirection} onSort={handleSort} />
                  </TableHead>
                  <TableHead>
                    <SortHeader label="นักเรียน" value="name" active={sortBy === 'name'} direction={sortDirection} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label="ห้อง" value="classroom" active={sortBy === 'classroom'} direction={sortDirection} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label="คะแนน" value="current_score" active={sortBy === 'current_score'} direction={sortDirection} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label="หัก/เพิ่ม" value="deducted" active={sortBy === 'deducted'} direction={sortDirection} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="w-[90px]">
                    <SortHeader label="จำนวน" value="transaction_count" active={sortBy === 'transaction_count'} direction={sortDirection} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label="สถานะ" value="status" active={sortBy === 'status'} direction={sortDirection} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label="ล่าสุด" value="latest" active={sortBy === 'latest'} direction={sortDirection} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="w-[120px] text-right">ดู</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedRows.map((row) => {
                  const status = statusLabel(row, baseScore);
                  return (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => setSelectedStudent(row)}>
                      <TableCell className="font-bold">#{row.rank_overall}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.full_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{row.student_id_number}</div>
                      </TableCell>
                      <TableCell>{row.classroom_name}</TableCell>
                      <TableCell>
                        <div className="font-bold">{row.current_score}</div>
                        <div className="text-xs text-muted-foreground">ห้อง #{row.rank_classroom} · ชั้น #{row.rank_grade}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-destructive">-{row.total_deducted}</div>
                        <div className="text-emerald-600">+{row.total_added}</div>
                      </TableCell>
                      <TableCell>{row.transaction_count}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-xs">{formatDateTime(row.latest_recorded_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedStudent(row);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={<Link href={`/students/${row.id}`} onClick={(event) => event.stopPropagation()} />}
                          >
                            โปรไฟล์
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selectedStudent && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-3 pr-8">
                  <div>
                    <SheetTitle>{selectedStudent.full_name}</SheetTitle>
                    <SheetDescription>
                      {selectedStudent.student_id_number} · {selectedStudent.classroom_name} · ปีการศึกษา {reportData?.academic_year}
                    </SheetDescription>
                  </div>
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/students/${selectedStudent.id}`} />}>
                    โปรไฟล์
                  </Button>
                </div>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">อันดับรวม</p>
                    <p className="text-2xl font-bold">#{selectedStudent.rank_overall}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">อันดับห้อง</p>
                    <p className="text-2xl font-bold">#{selectedStudent.rank_classroom}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">อันดับชั้น</p>
                    <p className="text-2xl font-bold">#{selectedStudent.rank_grade}</p>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">คะแนนปัจจุบัน</p>
                      <p className="text-3xl font-bold">{selectedStudent.current_score}</p>
                    </div>
                    <ScoreBadge score={selectedStudent.current_score} baseScore={baseScore} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div><p className="text-muted-foreground">หักสะสม</p><p className="font-semibold text-destructive">-{selectedStudent.total_deducted}</p></div>
                    <div><p className="text-muted-foreground">เพิ่มสะสม</p><p className="font-semibold text-emerald-600">+{selectedStudent.total_added}</p></div>
                    <div><p className="text-muted-foreground">จำนวนรายการ</p><p className="font-semibold">{selectedStudent.transaction_count}</p></div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">ประวัติล่าสุด</h3>
                  {selectedStudent.recent_transactions.length === 0 ? (
                    <div className="rounded-md border py-8 text-center text-sm text-muted-foreground">ยังไม่มีประวัติคะแนน</div>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudent.recent_transactions.map((tx) => (
                        <div key={tx.id} className="rounded-md border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{tx.category_name}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(tx.recorded_at)} · {tx.recorded_by_name || '-'}</p>
                            </div>
                            <span className={tx.points > 0 ? 'font-bold text-emerald-600' : 'font-bold text-destructive'}>
                              {tx.points > 0 ? `+${tx.points}` : tx.points}
                            </span>
                          </div>
                          {tx.note && <p className="mt-2 text-sm text-muted-foreground">{tx.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
