'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { useLocale, useTranslations } from 'next-intl';

export default function AuditLogPage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      const { data: actionData } = await supabase
        .from('action_logs')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditData) setAuditLogs(auditData);
      if (actionData) setActionLogs(actionData);
      setLoading(false);
    }
    load();
  }, []);

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
}: {
  rows: any[];
  emptyTitle: string;
  emptyDescription: string;
  eventKey: string;
  targetTypeKey: string;
  targetIdKey: string;
  locale: string;
}) {
  const settingsT = useTranslations('settings');

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
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{settingsT('time')}</TableHead>
              <TableHead>{settingsT('actor')}</TableHead>
              <TableHead>{settingsT('action')}</TableHead>
              <TableHead>{settingsT('target')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString(locale)}
                </TableCell>
                <TableCell className="text-sm">{log.profiles?.full_name || '-'}</TableCell>
                <TableCell className="text-sm">{log[eventKey]}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {log[targetTypeKey] || '-'}{log[targetIdKey] ? `: ${String(log[targetIdKey]).slice(0, 8)}...` : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
