'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ListChecks, School, TrendingDown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSchoolStatisticsReport, type SchoolStatisticsReportData } from '@/lib/actions/report.action';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';

const distributionColors: Record<string, string> = {
  excellent: '#059669',
  good: '#2563eb',
  fair: '#d97706',
  poor: '#dc2626',
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export default function SchoolStatisticsPage() {
  const reportT = useTranslations('report');
  const levelT = useTranslations('level');
  const commonT = useTranslations('common');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [data, setData] = useState<SchoolStatisticsReportData | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedAcademicYearId && !academicYearId) {
      setAcademicYearId(selectedAcademicYearId);
    }
  }, [academicYearId, selectedAcademicYearId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getSchoolStatisticsReport(academicYearId || selectedAcademicYearId || undefined);
      if (!cancelled) {
        if (result.success) {
          setData(result.data);
          if (!academicYearId && result.data.academic_year_id) {
            setAcademicYearId(result.data.academic_year_id);
          }
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [academicYearId, selectedAcademicYearId]);

  const distributionData = useMemo(() => (
    (data?.score_distribution || []).map((row) => ({
      ...row,
      label: levelT(row.name),
    }))
  ), [data, levelT]);

  const categoryData = useMemo(() => (
    (data?.category_breakdown || []).map((row) => ({
      ...row,
      label: row.name.length > 16 ? `${row.name.slice(0, 16)}...` : row.name,
    }))
  ), [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-sm text-muted-foreground">{commonT('notAvailable')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{reportT('statistics')}</h1>
          <p className="text-muted-foreground mt-1">
            {reportT('statisticsForYear', { year: data.academic_year || '-' })}
          </p>
        </div>
        <Select
          value={academicYearId || data.academic_year_id}
          onValueChange={(value) => {
            if (value) setAcademicYearId(value);
          }}
        >
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue placeholder={reportT('selectAcademicYear')} />
          </SelectTrigger>
          <SelectContent>
            {data.academic_years.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.name}{year.is_current ? ` ${reportT('currentYearBadge')}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={reportT('students')} value={data.summary.total_students} icon={Users} />
        <StatCard title={reportT('averageScore')} value={data.summary.average_score} icon={School} description={`${reportT('minScore')} ${data.summary.min_score} / ${reportT('maxScore')} ${data.summary.max_score}`} />
        <StatCard title={reportT('deductedTotalShort')} value={data.summary.total_deducted} icon={TrendingDown} description={`${data.summary.transaction_count} ${reportT('transactionCount')}`} />
        <StatCard title={reportT('atRisk')} value={data.summary.at_risk_count} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{reportT('scoreDistribution')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distributionData} dataKey="count" nameKey="label" outerRadius={95} label>
                  {distributionData.map((entry) => (
                    <Cell key={entry.name} fill={distributionColors[entry.name] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{reportT('monthlyTrend')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="deducted" name={reportT('deductedScore')} stroke="#dc2626" strokeWidth={2} />
                <Line type="monotone" dataKey="added" name={reportT('addedScore')} stroke="#059669" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{reportT('categoryBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="label" type="category" width={110} />
                <Tooltip />
                <Bar dataKey="count" name={reportT('transactionCount')} fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{reportT('classroomBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.classroom_breakdown} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total_deducted" name={reportT('deductedScore')} fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">{reportT('topRiskStudents')}</CardTitle>
            <ListChecks className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{reportT('studentName')}</TableHead>
                  <TableHead>{reportT('classroom')}</TableHead>
                  <TableHead className="text-right">{reportT('currentScore')}</TableHead>
                  <TableHead className="text-right">{reportT('deductedScore')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_risk_students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Link href={`/students/${student.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                        {student.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{student.student_id_number}</div>
                    </TableCell>
                    <TableCell>{student.classroom_name}</TableCell>
                    <TableCell className="text-right font-medium">{student.current_score}</TableCell>
                    <TableCell className="text-right">{student.total_deducted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{reportT('gradeBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.grade_breakdown.map((grade) => (
              <div key={grade.name} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <div className="font-medium">{grade.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {grade.total_students} {reportT('studentsLabel')} · {grade.transaction_count} {reportT('transactionCount')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{reportT('averageScore')}: {grade.average_score}</Badge>
                  <Badge variant={grade.total_deducted > 0 ? 'secondary' : 'outline'}>
                    {reportT('deductedScore')}: {grade.total_deducted}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
