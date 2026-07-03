'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CopyPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { SortableTableHead, type SortDirection } from '@/components/ui/sortable-table-head';
import { compareNullableNumber, compareNullableText, textOrEmpty } from '@/components/ui/table-helpers';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  createNextAcademicYearFromCurrent,
  getAcademicYears,
  type AcademicYearItem,
} from '@/lib/actions/academic-year.action';

type AcademicYearSortField = 'name' | 'status' | 'base_score' | 'start_date' | 'end_date';

function nextAcademicYearName(name: string) {
  const numeric = Number(name);
  if (Number.isInteger(numeric)) return String(numeric + 1);
  return null;
}

function getDaysUntil(date: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getRolloverBlockedReason(
  currentYear: AcademicYearItem | null,
  translate: (key: string, values?: Record<string, string | number>) => string,
) {
  if (!currentYear) return translate('noCurrentYearReason');
  if (!currentYear.end_date) return translate('missingCurrentYearEndDateReason');
  const daysUntilEnd = getDaysUntil(currentYear.end_date);
  if (daysUntilEnd === null) return translate('invalidCurrentYearEndDateReason');
  if (daysUntilEnd >= 0) return translate('currentYearNotEndedReason', { year: currentYear.name });
  return '';
}

export default function AcademicYearsPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const [years, setYears] = useState<AcademicYearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<AcademicYearSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAcademicYears({ bypassCache: true });
    if (result.success && result.data) {
      setYears(result.data);
    } else if (!result.success) {
      toast(settingsT('loadAcademicYearsFailed'), { description: result.error.message });
    }
    setLoading(false);
  }, [settingsT]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function createNextYear() {
    setSaving(true);
    try {
      const result = await createNextAcademicYearFromCurrent();
      if (result.success) {
        toast(settingsT('rolloverSuccess', { year: result.data.academic_year_name }), {
          description: settingsT('rolloverSuccessDescription', {
            classrooms: result.data.created_classrooms,
            assignments: result.data.created_assignments,
            enrollments: result.data.created_enrollments,
          }),
        });
        await load();
      } else {
        toast(settingsT('rolloverFailed'), { description: result.error.message });
      }
    } finally {
      setSaving(false);
    }
  }

  const sortedYears = useMemo(() => {
    return [...years].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = compareNullableText(a.name, b.name);
          break;
        case 'status':
          comparison = Number(a.is_current) - Number(b.is_current);
          break;
        case 'base_score':
          comparison = compareNullableNumber(a.base_score, b.base_score, 'asc');
          break;
        case 'start_date':
          comparison = compareNullableText(a.start_date, b.start_date);
          break;
        case 'end_date':
          comparison = compareNullableText(a.end_date, b.end_date);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sortDirection, sortField, years]);

  function handleSort(field: AcademicYearSortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'name' ? 'desc' : 'asc');
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="size-8" /></div>;

  const currentYear = years.find((year) => year.is_current) ?? null;
  const nextYearName = currentYear
    ? nextAcademicYearName(currentYear.name) ?? settingsT('nextYearSuffix', { name: currentYear.name })
    : '';
  const hasNextYear = nextYearName ? years.some((year) => year.name === nextYearName) : false;
  const daysUntilCurrentYearEnds = getDaysUntil(currentYear?.end_date ?? null);
  const shouldWarnNextYear = Boolean(
    currentYear &&
    !hasNextYear &&
    (daysUntilCurrentYearEnds === null || daysUntilCurrentYearEnds <= 90),
  );
  const rolloverBlockedReason = getRolloverBlockedReason(currentYear, settingsT);
  const canRollover = !rolloverBlockedReason;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{settingsT('manageAcademicYears')}</h1>
          <p className="text-muted-foreground mt-1">{settingsT('academicYearsDescription')}</p>
        </div>
        <Button
          variant="outline"
          onClick={createNextYear}
          disabled={saving || !canRollover}
          title={rolloverBlockedReason ? rolloverBlockedReason : undefined}
        >
          <CopyPlus className="h-4 w-4 mr-1" /> {settingsT('rolloverNextYear')}
        </Button>
      </div>

      {!currentYear && (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">{settingsT('noCurrentYearTitle')}</p>
              <p className="text-muted-foreground">{settingsT('noCurrentYearDescription')}</p>
            </div>
          </div>
        </div>
      )}

      {shouldWarnNextYear && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="font-medium">{settingsT('shouldCreateAcademicYear', { year: nextYearName })}</p>
              <p className="text-amber-800 dark:text-amber-200">
                {daysUntilCurrentYearEnds !== null && daysUntilCurrentYearEnds < 0
                  ? settingsT('academicYearEnded', { year: currentYear?.name ?? '' })
                  : daysUntilCurrentYearEnds !== null
                    ? settingsT('academicYearEndsIn', { year: currentYear?.name ?? '', days: daysUntilCurrentYearEnds })
                    : settingsT('nextAcademicYearMissing', { year: currentYear?.name ?? '' })}
                {' '}{settingsT('rolloverPreparationNote')}
              </p>
              {rolloverBlockedReason && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-200">
                  {settingsT('rolloverBlocked', { reason: rolloverBlockedReason })}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={createNextYear}
            disabled={saving || !canRollover}
            title={rolloverBlockedReason ? rolloverBlockedReason : undefined}
            className="w-full bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400 sm:w-auto"
          >
            <CopyPlus className="h-4 w-4 mr-1" /> {settingsT('rolloverShort', { year: nextYearName })}
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead field="name" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                  {commonT('academicYear')}
                </SortableTableHead>
                <SortableTableHead field="status" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                  {settingsT('status')}
                </SortableTableHead>
                <SortableTableHead field="base_score" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                  {settingsT('baseScore')}
                </SortableTableHead>
                <SortableTableHead field="start_date" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                  {settingsT('startDate')}
                </SortableTableHead>
                <SortableTableHead field="end_date" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                  {settingsT('endDate')}
                </SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{settingsT('noAcademicYears')}</TableCell></TableRow>
              ) : sortedYears.map((y) => (
                <TableRow key={y.id}>
                  <TableCell className="font-medium">{y.name}</TableCell>
                  <TableCell>
                    {y.is_current ? (
                      <Badge className="bg-green-500 text-white">{commonT('current')}</Badge>
                    ) : (
                      <Badge variant="outline">{settingsT('notActive')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{y.base_score ?? ''}</TableCell>
                  <TableCell className="text-xs">{textOrEmpty(y.start_date ? new Date(y.start_date).toLocaleDateString('th-TH') : '')}</TableCell>
                  <TableCell className="text-xs">{textOrEmpty(y.end_date ? new Date(y.end_date).toLocaleDateString('th-TH') : '')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
