'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, XCircle, CheckCircle, Clock, Eye, User, BookOpen, Hash, Calendar, FileText, UserCheck, Ban, AlertTriangle } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import type { ScoreTransactionWithDetails } from '@/lib/db/queries/score.queries';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function resolveEvidenceUrl(evidence: NonNullable<ScoreTransactionWithDetails['evidence']>[number]) {
  if (evidence.file_url) return evidence.file_url;
  if (!evidence.file_path) return '';
  if (evidence.file_path.startsWith('gdrive:')) {
    return `https://drive.google.com/uc?export=view&id=${evidence.file_path.slice('gdrive:'.length)}`;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return '';
  return `${supabaseUrl}/storage/v1/object/public/school-logos/${evidence.file_path}`;
}

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
  showStudentProfileLink?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  approved: { label: 'อนุมัติแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  voided: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function ScoreTransactionTable({
  data, loading, total, page = 1, pageSize = 50,
  onPageChange, onVoid, onApprove, showActions = true, showStudentProfileLink = false,
}: ScoreTransactionTableProps) {
  const [voidDialog, setVoidDialog] = useState<{ open: boolean; transactionId: string }>({ open: false, transactionId: '' });
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);
  const [detailTx, setDetailTx] = useState<ScoreTransactionWithDetails | null>(null);

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
                <TableRow
                  key={t.id}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setDetailTx(t)}
                >
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDateTime(t.recorded_at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs" onClick={showStudentProfileLink ? (e) => e.stopPropagation() : undefined}>
                    {showStudentProfileLink ? (
                      <Link
                        href={`/students/${t.student_id}`}
                        className="rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {t.student_id_number}
                      </Link>
                    ) : (
                      t.student_id_number
                    )}
                  </TableCell>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                        {t.status === 'pending' && onVoid && (
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

      {/* Detail Dialog */}
      <Dialog open={!!detailTx} onOpenChange={(open) => { if (!open) setDetailTx(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              รายละเอียดรายการคะแนน
            </DialogTitle>
          </DialogHeader>
          {detailTx && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex justify-between items-center">
                <Badge variant="outline" className={statusConfig[detailTx.status]?.color || ''}>
                  {statusConfig[detailTx.status]?.icon && (() => { const Icon = statusConfig[detailTx.status].icon; return <Icon className="mr-1 h-3 w-3 inline" />; })()}
                  {statusConfig[detailTx.status]?.label || detailTx.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ID: {detailTx.id.slice(0, 8)}...
                </span>
              </div>

              <Separator />

              {/* Student info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>ชื่อ-นามสกุล</span>
                  </div>
                  <p className="text-sm font-medium">{detailTx.student_name || '-'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    <span>รหัสนักเรียน</span>
                  </div>
                  <p className="text-sm font-mono">{detailTx.student_id_number || '-'}</p>
                </div>
              </div>
              {showStudentProfileLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  nativeButton={false}
                  render={<Link href={`/students/${detailTx.student_id}`} />}
                >
                  <User className="mr-2 h-4 w-4" />
                  เปิดโปรไฟล์นักเรียน
                </Button>
              )}

              {/* Classroom */}
              {(detailTx.classroom_name || detailTx.classroom_grade) && (
                <div className="flex items-center gap-1.5 text-sm">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">ห้องเรียน:</span>
                  <span className="font-medium">{detailTx.classroom_name || ''} {detailTx.classroom_grade ? `(ป.${detailTx.classroom_grade})` : ''}</span>
                </div>
              )}

              <Separator />

              {/* Score details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>หมวดคะแนน</span>
                  </div>
                  <p className="text-sm font-medium">{detailTx.category_name}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>ประเภท</span>
                  </div>
                  <Badge variant="outline" className={detailTx.category_type === 'deduct' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}>
                    {detailTx.category_type === 'deduct' ? 'ตัดคะแนน' : 'เพิ่มคะแนน'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>คะแนน</span>
                </div>
                <p className={`text-xl font-bold ${(detailTx.points || 0) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {(detailTx.points || 0) > 0 ? `+${detailTx.points}` : detailTx.points}
                  {' '}คะแนน
                </p>
              </div>

              {detailTx.note && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>หมายเหตุ</span>
                  </div>
                  <p className="text-sm bg-muted/50 rounded-md p-2">{detailTx.note}</p>
                </div>
              )}

              {detailTx.evidence && detailTx.evidence.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>รูปหลักฐาน</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {detailTx.evidence.map((item) => {
                      const url = resolveEvidenceUrl(item);
                      return (
                        <a
                          key={item.id}
                          href={url || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-md border bg-muted"
                          title={item.file_name}
                        >
                          {url && item.file_type?.startsWith('image/') ? (
                            <img src={url} alt={item.file_name} className="aspect-square w-full object-cover" />
                          ) : (
                            <div className="flex aspect-square items-center justify-center p-2 text-center text-xs text-muted-foreground">
                              {item.file_name}
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator />

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>บันทึกเมื่อ</span>
                  </div>
                  <p>{formatDateTime(detailTx.recorded_at)}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>บันทึกโดย</span>
                  </div>
                  <p>{detailTx.recorded_by_name || '-'}</p>
                </div>
              </div>

              {detailTx.status === 'approved' && detailTx.approved_at && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>อนุมัติเมื่อ</span>
                    </div>
                    <p>{formatDateTime(detailTx.approved_at)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>อนุมัติโดย</span>
                    </div>
                    <p>{detailTx.approved_by_name || '-'}</p>
                  </div>
                </div>
              )}

              {detailTx.status === 'voided' && (
                <div className="space-y-2 rounded-md bg-destructive/5 p-3">
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <Ban className="h-3.5 w-3.5" />
                    <span className="font-medium">รายการถูกยกเลิก</span>
                  </div>
                  {detailTx.void_reason && (
                    <p className="text-sm text-muted-foreground ml-5">เหตุผล: {detailTx.void_reason}</p>
                  )}
                  {detailTx.voided_at && (
                    <p className="text-xs text-muted-foreground ml-5">
                      เมื่อ {formatDateTime(detailTx.voided_at)}
                      {detailTx.voided_by_name ? ` โดย ${detailTx.voided_by_name}` : ''}
                    </p>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2">
                {detailTx.status === 'pending' && (
                  <>
                    {onApprove && (
                      <Button
                        variant="default"
                        onClick={() => { onApprove(detailTx.id); setDetailTx(null); }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        อนุมัติ
                      </Button>
                    )}
                    {onVoid && (
                      <Button
                        variant="destructive"
                        onClick={() => { setVoidDialog({ open: true, transactionId: detailTx.id }); setDetailTx(null); }}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        ปฏิเสธ
                      </Button>
                    )}
                  </>
                )}
                <Button variant="outline" onClick={() => setDetailTx(null)}>
                  ปิด
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
