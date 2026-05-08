'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { createClient } from '@/lib/supabase/client';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles!inner(full_name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setLogs(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">บันทึกการดำเนินการในระบบ</p>
      </div>

      {logs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>ไม่มีบันทึก</EmptyTitle>
            <EmptyDescription>ยังไม่มีรายการ Audit Log</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เวลา</TableHead>
                  <TableHead>ผู้ดำเนินการ</TableHead>
                  <TableHead>การกระทำ</TableHead>
                  <TableHead>เป้าหมาย</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </TableCell>
                    <TableCell className="text-sm">{log.profiles?.full_name || '-'}</TableCell>
                    <TableCell className="text-sm">{log.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.target_type}{log.target_id ? `: ${log.target_id.slice(0, 8)}...` : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
