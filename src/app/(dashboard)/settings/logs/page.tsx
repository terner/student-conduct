'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePaginationToolbar } from '@/components/ui/table-pagination-toolbar';
import { SortableTableHead, type SortDirection } from '@/components/ui/sortable-table-head';
import { compareNullableText, textOrEmpty } from '@/components/ui/table-helpers';
import { createClient } from '@/lib/supabase/client';
import { useLocale, useTranslations } from 'next-intl';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

interface LogRow {
  id: string;
  created_at: string;
  profiles?: { full_name?: string | null } | null;
  [key: string]: unknown;
}

type LogSortField = 'created_at' | 'actor' | 'action' | 'target';

function logValue(log: LogRow, key: string) {
  const value = log[key];
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function logTarget(log: LogRow, targetTypeKey: string, targetIdKey: string) {
  const targetType = logValue(log, targetTypeKey);
  const targetId = logValue(log, targetIdKey);
  if (!targetType) return '';
  return targetId ? `${targetType}: ${targetId.slice(0, 8)}...` : targetType;
}

export default function AuditLogPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const [auditLogs, setAuditLogs] = useState<LogRow[]>([]);
  const [actionLogs, setActionLogs] = useState<LogRow[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [actionTotal, setActionTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [actionPage, setActionPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(20);
  const [actionPageSize, setActionPageSize] = useState<number>(20);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
      setLoading(true);
      const supabase = createClient();
      const auditFrom = (auditPage - 1) * auditPageSize;
      const actionFrom = (actionPage - 1) * actionPageSize;
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*, profiles(full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(auditFrom, auditFrom + auditPageSize - 1);
      const { data: actionData } = await supabase
        .from('action_logs')
        .select('*, profiles(full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(actionFrom, actionFrom + actionPageSize - 1);

      if (auditData) setAuditLogs(auditData as LogRow[]);
      if (actionData) setActionLogs(actionData as LogRow[]);
      const { count: auditCount } = await supabase.from('audit_logs').select('id', { count: 'exact', head: true });
      const { count: actionCount } = await supabase.from('action_logs').select('id', { count: 'exact', head: true });
      setAuditTotal(auditCount || 0);
      setActionTotal(actionCount || 0);
      setLoading(false);
  }, [actionPage, actionPageSize, auditPage, auditPageSize]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{settingsT('auditLogsTitle')}</h1>
        <p className="text-muted-foreground mt-1">{settingsT('auditLogDescription')}</p>
      </div>

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">{settingsT('auditLogs')}</TabsTrigger>
          <TabsTrigger value="action">{settingsT('actionLogs')}</TabsTrigger>
        </TabsList>
        <TabsContent value="audit" className="mt-4">
          <LogTable
            rows={auditLogs}
            emptyTitle={settingsT('noAuditLogs')}
            emptyDescription={settingsT('noAuditLogsDescription')}
            eventKey="action"
            targetTypeKey="target_type"
            targetIdKey="target_id"
            locale={locale}
            page={auditPage}
            pageSize={auditPageSize}
            total={auditTotal}
            onPageSizeChange={setAuditPageSize}
            onPageChange={setAuditPage}
          />
        </TabsContent>
        <TabsContent value="action" className="mt-4">
          <LogTable
            rows={actionLogs}
            emptyTitle={settingsT('noActionLogs')}
            emptyDescription={settingsT('noActionLogsDescription')}
            eventKey="event"
            targetTypeKey="resource_type"
            targetIdKey="resource_id"
            locale={locale}
            page={actionPage}
            pageSize={actionPageSize}
            total={actionTotal}
            onPageSizeChange={setActionPageSize}
            onPageChange={setActionPage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LogTable({
  rows,
  emptyTitle,
  emptyDescription,
  eventKey,
  targetTypeKey,
  targetIdKey,
  locale,
  page,
  pageSize,
  total,
  onPageSizeChange,
  onPageChange,
}: {
  rows: LogRow[];
  emptyTitle: string;
  emptyDescription: string;
  eventKey: string;
  targetTypeKey: string;
  targetIdKey: string;
  locale: string;
  page: number;
  pageSize: number;
  total: number;
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (page: number) => void;
}) {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const [sortField, setSortField] = useState<LogSortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  function handleSort(field: LogSortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection(field === 'created_at' ? 'desc' : 'asc');
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'actor':
          comparison = compareNullableText(a.profiles?.full_name, b.profiles?.full_name);
          break;
        case 'action':
          comparison = compareNullableText(logValue(a, eventKey), logValue(b, eventKey));
          break;
        case 'target':
          comparison = compareNullableText(logTarget(a, targetTypeKey, targetIdKey), logTarget(b, targetTypeKey, targetIdKey));
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [eventKey, rows, sortDirection, sortField, targetIdKey, targetTypeKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min((currentPage - 1) * pageSize + sortedRows.length, total);

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <TablePaginationToolbar
        page={page}
        pageSize={pageSize}
        total={total}
        summary={commonT('paginationSummary', { start: from, end: to, total })}
        rowsPerPageLabel={commonT('rowsPerPage')}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageSizeChange={onPageSizeChange}
        onPageChange={onPageChange}
      />
      <Card>
        <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="created_at" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                {settingsT('time')}
              </SortableTableHead>
              <SortableTableHead field="actor" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                {settingsT('actor')}
              </SortableTableHead>
              <SortableTableHead field="action" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                {settingsT('action')}
              </SortableTableHead>
              <SortableTableHead field="target" activeField={sortField} direction={sortDirection} onSort={handleSort}>
                {settingsT('target')}
              </SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString(locale)}
                </TableCell>
                <TableCell className="text-sm">{textOrEmpty(log.profiles?.full_name)}</TableCell>
                <TableCell className="text-sm">{logValue(log, eventKey)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {logTarget(log, targetTypeKey, targetIdKey)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </CardContent>
      </Card>
    </>
  );
}
