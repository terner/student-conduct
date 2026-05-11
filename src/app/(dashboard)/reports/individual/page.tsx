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
import { SimplePagination } from '@/components/ui/simple-pagination';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getStudentRankingReport, type RankingSortBy, type StudentRankingRow } from '@/lib/actions/report.action';
import { getAcademicYears, getClassroomsForSelect } from '@/lib/actions/student.action';
import { exportCsv } from '@/lib/utils/csv';
import { useTranslations } from 'next-intl';

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

const sortOptions: Array<{ value: TableSortBy; labelKey: string }> = [
  { value: 'rank', labelKey: 'rank' },
  { value: 'current_score', labelKey: 'sortLowestScore' },
  { value: 'deducted', labelKey: 'sortMostDeducted' },
  { value: 'transaction_count', labelKey: 'sortMostRecords' },
  { value: 'latest', labelKey: 'sortLatest' },
  { value: 'name', labelKey: 'studentName' },
];
const serverSortValues: TableSortBy[] = ['current_score', 'deducted', 'transaction_count', 'latest', 'name'];
const PAGE_SIZE = 25;

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

function statusLabel(row: StudentRankingRow, baseScore: number, reportT: (key: string) => string) {
  if (row.current_score < baseScore - 40 || row.total_deducted >= 40) return { label: reportT('highRisk'), variant: 'destructive' as const };
  if (row.current_score < baseScore - 20 || row.total_deducted >= 20) return { label: reportT('watchlist'), variant: 'secondary' as const };
  return { label: reportT('normal'), variant: 'outline' as const };
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
  ascLabel,
  descLabel,
}: {
  label: string;
  value: TableSortBy;
  active: boolean;
  direction: SortDirection;
  onSort: (value: TableSortBy) => void;
  className?: string;
  ascLabel: string;
  descLabel: string;
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
      {active && <span className="ml-0.5 text-[10px] text-muted-foreground">{direction === 'asc' ? ascLabel : descLabel}</span>}
    </Button>
  );
}

export default function IndividualReportPage() {
  const reportT = useTranslations('report');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
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
  const [page, setPage] = useState(1);
  const sortLabel = (value: TableSortBy) => reportT(sortOptions.find((option) => option.value === value)?.labelKey || 'studentName');

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
      setPage(1);
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
    setPage(1);
  }

  function handleSort(value: TableSortBy) {
    if (sortBy === value) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(value);
    setSortDirection(defaultDirection(value));
    setPage(1);
  }

  function handleExport() {
    if (!reportData?.rows) return;
    exportCsv(displayedRows.map((row: StudentRankingRow) => ({
      [reportT('overallRank')]: row.rank_overall,
      [reportT('classroomRank')]: row.rank_classroom,
      [reportT('gradeRank')]: row.rank_grade,
      [reportT('studentId')]: row.student_id_number,
      [reportT('studentName')]: row.full_name,
      [reportT('classroom')]: row.classroom_name,
      [reportT('currentScore')]: row.current_score,
      [reportT('totalDeducted')]: row.total_deducted,
      [reportT('totalAdded')]: row.total_added,
      [reportT('transactionCount')]: row.transaction_count,
      [reportT('latestRecorded')]: row.latest_recorded_at ? formatDateTime(row.latest_recorded_at) : '',
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
  const pagedRows = useMemo(() => displayedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [displayedRows, page]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{reportT('individualTitle')}</h1>
          <p className="text-muted-foreground mt-1">{reportT('individualDescriptionFull')}</p>
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
              <SelectValue placeholder={commonT('academicYear')} />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id} label={year.name}>
                  {year.name}{year.is_current ? ` (${commonT('current')})` : ''}
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
              <SelectValue placeholder={reportT('allGradeLevels')} />
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
              <SelectValue placeholder={reportT('allClassrooms')} />
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
              placeholder={reportT('searchStudentPlaceholder')}
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
            itemToStringLabel={(value) => value === 'score' ? reportT('scoreBest') : reportT('watchlist')}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder={reportT('rankModePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="risk" label={reportT('watchlist')}>{reportT('watchlist')}</SelectItem>
              <SelectItem value="score" label={reportT('scoreBest')}>{reportT('scoreBest')}</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sortOptions.some((option) => option.value === sortBy) ? sortBy : null}
            onValueChange={(value: TableSortBy | null) => {
              const next = value || 'current_score';
              setSortBy(next);
              setSortDirection(next === 'current_score' ? defaultScoreDirection(rankMode) : defaultDirection(next));
            }}
            itemToStringLabel={(value) => sortOptions.find((item) => item.value === value) ? sortLabel(value as TableSortBy) : String(value)}
          >
            <SelectTrigger className="h-10 w-full">
              <ArrowDownUp className="mr-1 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={reportT('sortBy')} />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((item) => (
                <SelectItem key={item.value} value={item.value} label={reportT(item.labelKey)}>
                  {reportT(item.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={applyFilters} disabled={loading} className="h-10">
            {commonT('search')}
          </Button>
          <Button variant="outline" onClick={clearFilters} disabled={loading} className="h-10">
            <X className="mr-2 h-4 w-4" />
            {commonT('clear')}
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{reportT('studentsLabel')}</p><p className="text-2xl font-bold">{summary.total_students}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{reportT('averageScore')}</p><p className="text-2xl font-bold">{summary.average_score}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{reportT('minScore')}</p><p className="text-2xl font-bold text-destructive">{summary.min_score}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{reportT('maxScore')}</p><p className="text-2xl font-bold text-emerald-600">{summary.max_score}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{reportT('deductedTotalShort')}</p><p className="text-2xl font-bold">{summary.total_deducted}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{reportT('watchlist')}</p><p className="text-2xl font-bold text-amber-600">{summary.at_risk_count}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{reportT('rankingTitle', { year: reportData?.academic_year || commonT('notAvailable') })}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {rankMode === 'risk'
                ? reportT('riskRankingNote')
                : reportT('scoreRankingNote')}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="size-8" /></div>
          ) : displayedRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">{reportT('noFilteredData')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">
                    <SortHeader label={reportT('rank')} value="rank" active={sortBy === 'rank'} direction={sortDirection} onSort={handleSort} ascLabel={reportT('ascending')} descLabel={reportT('descending')} />
                  </TableHead>
                  <TableHead>
                    <SortHeader label={reportT('studentsLabel')} value="name" active={sortBy === 'name'} direction={sortDirection} onSort={handleSort} ascLabel={reportT('ascending')} descLabel={reportT('descending')} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label={reportT('classroom')} value="classroom" active={sortBy === 'classroom'} direction={sortDirection} onSort={handleSort} ascLabel={reportT('ascending')} descLabel={reportT('descending')} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label={reportT('currentScore')} value="current_score" active={sortBy === 'current_score'} direction={sortDirection} onSort={handleSort} ascLabel={reportT('ascending')} descLabel={reportT('descending')} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label={`${reportT('deductedScore')}/${reportT('addedScore')}`} value="deducted" active={sortBy === 'deducted'} direction={sortDirection} onSort={handleSort} ascLabel={reportT('ascending')} descLabel={reportT('descending')} />
                  </TableHead>
                  <TableHead className="w-[90px]">
                    <SortHeader label={reportT('transactionCount')} value="transaction_count" active={sortBy === 'transaction_count'} direction={sortDirection} onSort={handleSort} ascLabel={reportT('ascending')} descLabel={reportT('descending')} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label={studentT('status')} value="status" active={sortBy === 'status'} direction={sortDirection} onSort={handleSort} ascLabel={reportT('ascending')} descLabel={reportT('descending')} />
                  </TableHead>
                  <TableHead className="w-[110px]">
                    <SortHeader label={reportT('sortLatest')} value="latest" active={sortBy === 'latest'} direction={sortDirection} onSort={handleSort} ascLabel={reportT('ascending')} descLabel={reportT('descending')} />
                  </TableHead>
                  <TableHead className="w-[120px] text-right">{reportT('viewColumn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((row) => {
                  const status = statusLabel(row, baseScore, reportT);
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
                        <div className="text-xs text-muted-foreground">{reportT('classroomAndGradeRank', { classroom: row.rank_classroom, grade: row.rank_grade })}</div>
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
                            {reportT('profile')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!loading && displayedRows.length > 0 && (
            <SimplePagination page={page} pageSize={PAGE_SIZE} total={displayedRows.length} onPageChange={setPage} />
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
                      {reportT('studentYearDescription', {
                        studentId: selectedStudent.student_id_number,
                        classroom: selectedStudent.classroom_name,
                        year: reportData?.academic_year || commonT('notAvailable'),
                      })}
                    </SheetDescription>
                  </div>
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/students/${selectedStudent.id}`} />}>
                    {reportT('profile')}
                  </Button>
                </div>
              </SheetHeader>

              <div className="space-y-4 px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{reportT('overallRank')}</p>
                    <p className="text-2xl font-bold">#{selectedStudent.rank_overall}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{reportT('classroomRank')}</p>
                    <p className="text-2xl font-bold">#{selectedStudent.rank_classroom}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{reportT('gradeRank')}</p>
                    <p className="text-2xl font-bold">#{selectedStudent.rank_grade}</p>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{reportT('currentScore')}</p>
                      <p className="text-3xl font-bold">{selectedStudent.current_score}</p>
                    </div>
                    <ScoreBadge score={selectedStudent.current_score} baseScore={baseScore} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div><p className="text-muted-foreground">{reportT('totalDeducted')}</p><p className="font-semibold text-destructive">-{selectedStudent.total_deducted}</p></div>
                    <div><p className="text-muted-foreground">{reportT('totalAdded')}</p><p className="font-semibold text-emerald-600">+{selectedStudent.total_added}</p></div>
                    <div><p className="text-muted-foreground">{reportT('transactionCount')}</p><p className="font-semibold">{selectedStudent.transaction_count}</p></div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">{reportT('latestHistory')}</h3>
                  {selectedStudent.recent_transactions.length === 0 ? (
                    <div className="rounded-md border py-8 text-center text-sm text-muted-foreground">{reportT('noScoreHistory')}</div>
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
