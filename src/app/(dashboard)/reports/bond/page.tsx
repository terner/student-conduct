'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { TablePaginationToolbar } from '@/components/ui/table-pagination-toolbar';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { exportToCSV } from '@/lib/utils/export';

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
  const prefix = profile?.prefix?.trim();
  const fullName = profile?.full_name?.trim();
  if (!fullName) return undefined;
  if (!prefix) return fullName;
  return fullName.startsWith(prefix) ? fullName : `${prefix}${fullName}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export default function BondDocumentsPage() {
  const thresholdT = useTranslations('threshold');
  const studentT = useTranslations('student');
  const commonT = useTranslations('common');
  const [bonds, setBonds] = useState<BondDocumentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [loading, setLoading] = useState(true);

  const loadBonds = useCallback(async (nextPage: number, nextPageSize: number) => {
    setLoading(true);
    const supabase = createClient();
    const from = (nextPage - 1) * nextPageSize;
    const { data, count } = await supabase
      .from('bond_documents')
      .select('*, students(student_id_number, profiles!inner(full_name, prefix)), academic_years(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + nextPageSize - 1);
    if (data) setBonds(data as BondDocumentRow[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBonds(page, pageSize);
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadBonds, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min((currentPage - 1) * pageSize + bonds.length, total);

  useEffect(() => {
    if (page > totalPages) {
      void Promise.resolve().then(() => setPage(1));
    }
  }, [page, totalPages]);

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
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => {
            if (bonds.length === 0) return;
            const rows = bonds.map(b => ({
              'เลขที่เอกสาร': b.document_no,
              'ชื่อนักเรียน': formatProfileFullName(b.students?.profiles),
              'รหัสนักเรียน': b.students?.student_id_number ?? '',
              'ปีการศึกษา': b.academic_years?.name ?? '',
              'คะแนนหักที่เกณฑ์': b.threshold_deducted,
              'สถานะ': statusLabel[b.status] ?? b.status,
              'วันที่สร้าง': formatDateTime(b.created_at),
            }));
            exportToCSV(rows, `ทัณฑ์บน_${new Date().toISOString().slice(0,10)}`);
          }} disabled={bonds.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            {thresholdT('print')}
          </Button>
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
        <>
          <TablePaginationToolbar
            page={page}
            pageSize={pageSize}
            total={total}
            summary={commonT('paginationSummary', { start: from, end: to, total })}
            rowsPerPageLabel={commonT('rowsPerPage')}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            onPageChange={setPage}
          />
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
                    <TableCell>{b.academic_years?.name}</TableCell>
                    <TableCell>{b.threshold_deducted}</TableCell>
                    <TableCell>
                      {statusLabel[b.status] && (
                        <Badge className={`${statusColor[b.status] ?? ''} text-white`}>
                          {statusLabel[b.status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(b.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
