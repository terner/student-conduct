'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, XCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ScoreTransactionWithDetails } from '@/lib/db/queries/score.queries';

interface ScoreTransactionTableProps {
  data: ScoreTransactionWithDetails[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onVoid?: (transactionId: string, reason: string) => Promise<void>;
  onApprove?: (transactionId: string) => Promise<void>;
  showActions?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  approved: { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  voided: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function ScoreTransactionTable({
  data, loading, total, page = 1, pageSize = 50,
  onPageChange, onVoid, onApprove, showActions = true,
}: ScoreTransactionTableProps) {
  const [voidDialog, setVoidDialog] = useState<{ open: boolean; transactionId: string }>({ open: false, transactionId: '' });
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>ไม่พบรายการ</EmptyTitle>
          <EmptyDescription>ยังไม่มีการบันทึกคะแนน</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const totalPages = total ? Math.ceil(total / pageSize) : 1;

  const handleVoid = async () => {
    if (!voidReason.trim()) return;
    setVoidLoading(true);
    try {
      await onVoid?.(voidDialog.transactionId, voidReason);
      setVoidDialog({ open: false, transactionId: '' });
      setVoidReason('');
    } catch {
      // handled
    } finally {
      setVoidLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>รหัสนักเรียน</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>คะแนน</TableHead>
              <TableHead>หมายเหตุ</TableHead>
              <TableHead>บันทึกโดย</TableHead>
              <TableHead>สถานะ</TableHead>
              {showActions && <TableHead className="w-[100px]">จัดการ</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((t) => {
              const StatusIcon = statusConfig[t.status]?.icon;
              return (
                <TableRow key={t.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(t.recorded_at).toLocaleDateString('th-TH')}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.student_id_number}</TableCell>
                  <TableCell>{t.category_name}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${t.points > 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {t.points > 0 ? `+${t.points}` : t.points}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {t.note || '-'}
                  </TableCell>
                  <TableCell className="text-xs">{t.recorded_by_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusConfig[t.status]?.color || ''}>
                      {StatusIcon && <StatusIcon className="mr-1 h-3 w-3 inline" />}
                      {statusConfig[t.status]?.label || t.status}
                    </Badge>
                  </TableCell>
                  {showActions && (
                    <TableCell>
                      <div className="flex gap-1">
                        {t.status === 'pending' && onApprove && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600"
                            onClick={() => onApprove(t.id)}
                            title="อนุมัติ"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {t.status === 'approved' && onVoid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setVoidDialog({ open: true, transactionId: t.id })}
                            title="ยกเลิก"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />ก่อนหน้า
          </Button>
          <span className="text-sm text-muted-foreground px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            ถัดไป<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={voidDialog.open} onOpenChange={(open) => setVoidDialog({ ...voidDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยกเลิกรายการคะแนน</DialogTitle>
            <DialogDescription>กรุณาระบุเหตุผลในการยกเลิก</DialogDescription>
          </DialogHeader>
          <Textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="เหตุผลในการยกเลิก..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog({ open: false, transactionId: '' })}>
              ยกเลิก
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidReason.trim() || voidLoading}>
              {voidLoading ? 'กำลังดำเนินการ...' : 'ยืนยันยกเลิก'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
