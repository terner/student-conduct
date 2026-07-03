'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { SimplePagination } from '@/components/ui/simple-pagination';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

interface BondProfile {
  full_name?: string | null;
  prefix?: string | null;
}

interface BondDocumentRow {
  id: string;
  document_no: string;
  threshold_deducted: number;
  status: string;
  created_at: string;
  students?: {
    student_id_number?: string | null;
    profiles?: BondProfile | null;
  } | null;
  academic_years?: {
    name?: string | null;
  } | null;
}

function formatProfileFullName(profile?: BondProfile | null) {
  const prefix = (profile?.prefix ?? '').trim();
  const fullName = (profile?.full_name ?? '').trim();
  if (!prefix) return fullName;
  return fullName.startsWith(prefix) ? fullName : `${prefix}${fullName}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

const PAGE_SIZE = 25;

export default function BondDocumentsPage() {
  const thresholdT = useTranslations('threshold');
  const studentT = useTranslations('student');
  const commonT = useTranslations('common');
  const [bonds, setBonds] = useState<BondDocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadBonds = useCallback(async (nextPage: number) => {
    setLoading(true);
    const supabase = createClient();
    const from = (nextPage - 1) * PAGE_SIZE;
    const { data, count } = await supabase
      .from('bond_documents')
      .select('*, students(student_id_number, profiles!inner(full_name, prefix)), academic_years(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (data) setBonds(data as BondDocumentRow[]);
    setTotal(count || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBonds(page);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadBonds, page]);

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-500', generated: 'bg-blue-500', signed: 'bg-green-500', cancelled: 'bg-red-500',
  };
  const statusLabel: Record<string, string> = {
    draft: thresholdT('bondStatusDraft'),
    generated: thresholdT('bondStatusGenerated'),
    signed: thresholdT('bondStatusSigned'),
    cancelled: thresholdT('bondStatusCancelled'),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{thresholdT('bondTitle')}</h1>
          <p className="text-muted-foreground mt-1">{thresholdT('bondDescription')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="size-8" /></div>
      ) : bonds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            {thresholdT('noBondDocuments')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{thresholdT('documentNo')}</TableHead>
                  <TableHead>{studentT('detail')}</TableHead>
                  <TableHead>{commonT('academicYear')}</TableHead>
                  <TableHead>{thresholdT('deductedThreshold')}</TableHead>
                  <TableHead>{studentT('status')}</TableHead>
                  <TableHead>{thresholdT('createdDate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonds.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.document_no}</TableCell>
                    <TableCell>{formatProfileFullName(b.students?.profiles)}</TableCell>
                    <TableCell>{b.academic_years?.name ?? ''}</TableCell>
                    <TableCell>{b.threshold_deducted}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColor[b.status] ?? ''} text-white`}>
                        {statusLabel[b.status] ?? ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(b.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <SimplePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
