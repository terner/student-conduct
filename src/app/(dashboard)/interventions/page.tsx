'use client';

import { useState, useEffect } from 'react';
import { Phone, MessageSquare, Home, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

function formatProfileFullName(profile: any) {
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

const typeIcon: Record<string, any> = {
  phone_call: Phone, parent_meeting: MessageSquare, warning: AlertTriangle,
  home_visit: Home, counseling: MessageSquare, bond: FileText,
};
const PAGE_SIZE = 25;

export default function InterventionsPage() {
  const interventionT = useTranslations('intervention');
  const studentT = useTranslations('student');
  const commonT = useTranslations('common');
  const [interventions, setInterventions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const typeLabel: Record<string, string> = {
    phone_call: interventionT('phoneCall'),
    parent_meeting: interventionT('parentMeeting'),
    warning: interventionT('warning'),
    bond: interventionT('bond'),
    home_visit: interventionT('homeVisit'),
    counseling: interventionT('counseling'),
    other: interventionT('other'),
  };

  useEffect(() => { load(page); }, [page]);

  async function load(nextPage = page) {
    setLoading(true);
    const supabase = createClient();
    const from = (nextPage - 1) * PAGE_SIZE;
    const { data, count } = await supabase
      .from('intervention_logs')
      .select('*, students(student_id_number, profiles!inner(full_name, prefix))', { count: 'exact' })
      .order('occurred_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (data) setInterventions(data);
    setTotal(count || 0);
    setLoading(false);
  }

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
                  <TableHead>{interventionT('date')}</TableHead>
                  <TableHead>{studentT('detail')}</TableHead>
                  <TableHead>{interventionT('type')}</TableHead>
                  <TableHead>{interventionT('summary')}</TableHead>
                  <TableHead>{interventionT('outcome')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interventions.map((iv: any) => {
                  const Icon = typeIcon[iv.intervention_type] || FileText;
                  return (
                    <TableRow key={iv.id}>
                      <TableCell className="text-xs">{formatDateTime(iv.occurred_at)}</TableCell>
                      <TableCell className="font-medium">{formatProfileFullName(iv.students?.profiles) || commonT('notAvailable')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Icon className="h-3 w-3" /> {typeLabel[iv.intervention_type] || iv.intervention_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[300px] truncate">{iv.summary}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{iv.outcome || commonT('notAvailable')}</TableCell>
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
