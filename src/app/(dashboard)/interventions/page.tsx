'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Phone, MessageSquare, Home, AlertTriangle, FileText, type LucideProps } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { SortableTableHead, type SortDirection } from '@/components/ui/sortable-table-head';
import { compareNullableText, textOrEmpty } from '@/components/ui/table-helpers';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

interface InterventionProfile {
  prefix?: string | null;
  full_name?: string | null;
}

interface InterventionRow {
  id: string;
  occurred_at: string;
  intervention_type: string;
  summary: string;
  outcome?: string | null;
  students?: {
    profiles?: InterventionProfile | null;
  } | null;
}

function formatProfileFullName(profile?: InterventionProfile | null) {
  const prefix = (profile?.prefix || '').trim();
  const fullName = (profile?.full_name || '').trim();
  if (!prefix) return fullName;
  return fullName.startsWith(prefix) ? fullName : `${prefix}${fullName}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

const typeIcon: Record<string, ComponentType<LucideProps>> = {
  phone_call: Phone, parent_meeting: MessageSquare, warning: AlertTriangle,
  home_visit: Home, counseling: MessageSquare, bond: FileText,
};
const PAGE_SIZE = 25;
type InterventionSortField = 'occurred_at' | 'student' | 'type' | 'summary' | 'outcome';

export default function InterventionsPage() {
  const interventionT = useTranslations('intervention');
  const studentT = useTranslations('student');
  const [interventions, setInterventions] = useState<InterventionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<InterventionSortField>('occurred_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const typeLabel: Record<string, string> = useMemo(() => ({
    phone_call: interventionT('phoneCall'),
    parent_meeting: interventionT('parentMeeting'),
    warning: interventionT('warning'),
    bond: interventionT('bond'),
    home_visit: interventionT('homeVisit'),
    counseling: interventionT('counseling'),
    other: interventionT('other'),
  }), [interventionT]);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    const supabase = createClient();
    const from = (nextPage - 1) * PAGE_SIZE;
    const { data, count } = await supabase
      .from('intervention_logs')
      .select('*, students(student_id_number, profiles!inner(full_name, prefix))', { count: 'exact' })
      .order('occurred_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (data) setInterventions(data as InterventionRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load(page));
  }, [load, page]);

  function handleSort(field: InterventionSortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'occurred_at' ? 'desc' : 'asc');
  }

  const sortedInterventions = useMemo(() => {
    return [...interventions].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'occurred_at':
          comparison = new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime();
          break;
        case 'student':
          comparison = compareNullableText(formatProfileFullName(a.students?.profiles), formatProfileFullName(b.students?.profiles));
          break;
        case 'type':
          comparison = compareNullableText(typeLabel[a.intervention_type], typeLabel[b.intervention_type]);
          break;
        case 'summary':
          comparison = compareNullableText(a.summary, b.summary);
          break;
        case 'outcome':
          comparison = compareNullableText(a.outcome, b.outcome);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [interventions, sortDirection, sortField, typeLabel]);

  if (loading) return <div className="flex justify-center py-12"><Spinner className="size-8" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{interventionT('title')}</h1>
        <p className="text-muted-foreground mt-1">{interventionT('description')}</p>
      </div>

      {interventions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Phone className="h-8 w-8 mx-auto mb-2" />
            {interventionT('noRecords')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="occurred_at" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                    {interventionT('date')}
                  </SortableTableHead>
                  <SortableTableHead field="student" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                    {studentT('detail')}
                  </SortableTableHead>
                  <SortableTableHead field="type" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                    {interventionT('type')}
                  </SortableTableHead>
                  <SortableTableHead field="summary" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                    {interventionT('summary')}
                  </SortableTableHead>
                  <SortableTableHead field="outcome" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                    {interventionT('outcome')}
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInterventions.map((iv) => {
                  const Icon = typeIcon[iv.intervention_type];
                  return (
                    <TableRow key={iv.id}>
                      <TableCell className="text-xs">{formatDateTime(iv.occurred_at)}</TableCell>
                      <TableCell className="font-medium">{formatProfileFullName(iv.students?.profiles)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {Icon ? <Icon className="h-3 w-3" /> : null}
                          {textOrEmpty(typeLabel[iv.intervention_type])}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{iv.summary}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{textOrEmpty(iv.outcome)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          <SimplePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
