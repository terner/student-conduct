'use client';

import Image from 'next/image';
import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, XCircle, CheckCircle, Clock, Eye, User, BookOpen, Hash, Calendar, UserCheck, Ban, Loader2, ArrowUpRight, type LucideProps } from 'lucide-react';
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
  return `${supabaseUrl}/storage/v1/object/public/evidence/${evidence.file_path}`;
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

const statusConfig: Record<string, { labelKey: string; color: string; icon: ComponentType<LucideProps> }> = {
  approved: { labelKey: 'approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { labelKey: 'pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  voided: { labelKey: 'voided', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export function ScoreTransactionTable({
  data, loading, total, page = 1, pageSize = 50,
  onPageChange, onVoid, onApprove, showActions = true, showStudentProfileLink = false,
}: ScoreTransactionTableProps) {
  const scoreT = useTranslations('score');
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const [voidDialog, setVoidDialog] = useState<{ open: boolean; transactionId: string }>({ open: false, transactionId: '' });
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);
  const [detailTx, setDetailTx] = useState<ScoreTransactionWithDetails | null>(null);
  const specialAddLabel = studentT('specialAdd');
  const specialDeductLabel = studentT('specialDeduct');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{scoreT('noTransactionsTitle')}</EmptyTitle>
          <EmptyDescription>{scoreT('noTransactionsDescription')}</EmptyDescription>
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
              <TableHead>{scoreT('date')}</TableHead>
              <TableHead>{scoreT('studentId')}</TableHead>
              <TableHead>{scoreT('type')}</TableHead>
              <TableHead>{scoreT('points')}</TableHead>
              <TableHead>{scoreT('note')}</TableHead>
              <TableHead>{scoreT('recordedBy')}</TableHead>
              <TableHead>{scoreT('status')}</TableHead>
              {showActions && <TableHead className="w-[100px]">{scoreT('actions')}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((t) => {
              const status = statusConfig[t.status];
              const StatusIcon = status?.icon;
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
                        href={`/students?studentId=${t.student_id}`}
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
                    {t.note ?? ''}
                  </TableCell>
                  <TableCell className="text-xs">{t.recorded_by_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status?.color ?? ''}>
                      {StatusIcon && <StatusIcon className="mr-1 h-3 w-3 inline" />}
                      {status?.labelKey ? scoreT(status.labelKey) : ''}
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
                            disabled={approveLoading === t.id}
                            onClick={async () => {
                              setApproveLoading(t.id);
                              await onApprove(t.id);
                              setApproveLoading(null);
                            }}
                            title={scoreT('approve')}
                          >
                            {approveLoading === t.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {t.status === 'pending' && onVoid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setVoidDialog({ open: true, transactionId: t.id })}
                            title={scoreT('void')}
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
            <ChevronLeft className="h-4 w-4" />{commonT('previous')}
          </Button>
          <span className="text-sm text-muted-foreground px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            {commonT('next')}<ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={voidDialog.open} onOpenChange={(open) => setVoidDialog({ ...voidDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              {scoreT('voidTitle')}
            </DialogTitle>
            <DialogDescription>{scoreT('voidDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder={scoreT('voidReasonPlaceholder')}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setVoidDialog({ open: false, transactionId: '' })} className="sm:w-auto">
              {commonT('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidReason.trim() || voidLoading} className="sm:w-auto">
              {voidLoading ? scoreT('voiding') : scoreT('confirmVoid')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailTx} onOpenChange={(open) => { if (!open) setDetailTx(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {scoreT('transactionDetail')}
            </DialogTitle>
          </DialogHeader>
          {detailTx && (
            <div className="space-y-3">
              {(() => {
                const detailStatus = statusConfig[detailTx.status];
                const detailPoints = detailTx.points ?? 0;
                return (
                  <>
              {/* Info Card */}
              <div className="rounded-lg border p-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{studentT('detail')}</p>
                  {showStudentProfileLink && (
                    <Button variant="ghost" size="sm" className="h-auto p-0 text-primary hover:text-primary/80" nativeButton={false} render={<Link href={`/students?studentId=${detailTx.student_id}`} />}>
                      <span className="text-xs">{scoreT('openStudentProfile')}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  )}
                </div>
                <Separator />
                <InfoLine icon={<User className="h-3.5 w-3.5" />} label={studentT('fullName')} value={detailTx.student_name} />
                <InfoLine icon={<Hash className="h-3.5 w-3.5" />} label={scoreT('studentId')} value={detailTx.student_id_number} mono />
                {detailTx.classroom_name && (
                  <InfoLine icon={<BookOpen className="h-3.5 w-3.5" />} label={scoreT('classroom')} value={detailTx.classroom_name} />
                )}
              </div>

              {/* Score + Status Card */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{scoreT('points')}</p>
                  <Badge variant="outline" className={detailStatus?.color ?? ''}>
                    {detailStatus?.labelKey ? scoreT(detailStatus.labelKey) : ''}
                  </Badge>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${detailPoints > 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {detailPoints > 0 ? `+${detailPoints}` : detailPoints}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{detailTx.category_name}</p>
                {(() => {
                  const noteDetails = extractSpecialNote(detailTx.note, specialAddLabel, specialDeductLabel);
                  if (!noteDetails) return null;
                  const basePoints = Math.abs(detailPoints) - noteDetails.points;
                  const isDeduct = detailPoints < 0;
                  return (
                    <div className="mt-2 pt-2 border-t text-xs space-y-0.5">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{detailTx.category_name}</span>
                        <span className="tabular-nums">{isDeduct ? `-${basePoints}` : `+${basePoints}`}</span>
                      </div>
                      <div className="flex justify-between text-amber-600">
                        <span>{`⚡ ${noteDetails.type === 'add' ? specialAddLabel : specialDeductLabel}`}</span>
                        <span className="tabular-nums">{isDeduct ? `-${noteDetails.points}` : `+${noteDetails.points}`}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Note */}
              {(() => {
                if (!detailTx.note) return null;
                const noteDetails = extractSpecialNote(detailTx.note, specialAddLabel, specialDeductLabel);
                const mainNote = splitMainNote(detailTx.note, noteDetails?.line);
                return (
                  <>
                    {mainNote && (
                      <div className="rounded-lg border p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{scoreT('note')}</p>
                        <p className="text-sm">{mainNote}</p>
                      </div>
                    )}
                    {noteDetails && (() => {
                      return (
                        <div className="rounded-lg border p-4 border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">{`⚡ ${scoreT('specialNoteTitle')}`}</p>
                          <p className="text-sm">{noteDetails.reason}</p>
                        </div>
                      );
                    })()}
                  </>
                );
              })()}

              {/* Evidence */}
              {detailTx.evidence && detailTx.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{scoreT('evidence')}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                  {detailTx.evidence.map((item) => {
                    const url = resolveEvidenceUrl(item);
                    return (
                      <a key={item.id} href={url ? url : undefined} target="_blank" rel="noreferrer" className="shrink-0 overflow-hidden rounded-lg border">
                        {url && item.file_type?.startsWith('image/') ? (
                          <Image src={url} alt={item.file_name} width={80} height={80} className="h-20 w-20 object-cover" unoptimized />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center text-xs text-muted-foreground p-1">{item.file_name}</div>
                        )}
                      </a>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* Timeline Card */}
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{scoreT('historyTitle')}</p>
                <div className="space-y-1.5 text-xs text-muted-foreground border-l-2 border-muted pl-3">
                  <TimelineEntry icon={<Calendar className="h-3 w-3" />} label={scoreT('recordedBy')} who={detailTx.recorded_by_name} when={detailTx.recorded_at} />
                  {detailTx.approved_by_name && (
                    <TimelineEntry icon={<UserCheck className="h-3 w-3 text-green-600" />} label={scoreT('approvedBy')} who={detailTx.approved_by_name} when={detailTx.approved_at} />
                  )}
                  {detailTx.voided_by_name && (
                    <TimelineEntry icon={<Ban className="h-3 w-3 text-destructive" />} label={scoreT('voided')} who={detailTx.voided_by_name} when={detailTx.voided_at} />
                  )}
                </div>
              </div>

              {/* Actions */}
              {detailTx.status === 'pending' && (
                <div className="flex flex-col gap-2">
                  {onApprove && (
                    <Button className="w-full bg-green-100 hover:bg-green-200 text-green-700 border-green-200" disabled={approveLoading === detailTx.id} onClick={async () => {
                      setApproveLoading(detailTx.id);
                      await onApprove(detailTx.id);
                      setApproveLoading(null);
                      setDetailTx(null);
                    }}>
                      {approveLoading === detailTx.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      {scoreT('approve')}
                    </Button>
                  )}
                  {onVoid && (
                    <Button variant="outline" className="w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => {
                      setVoidDialog({ open: true, transactionId: detailTx.id });
                    }}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {scoreT('void')}
                    </Button>
                  )}
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={() => setDetailTx(null)}>
                {scoreT('close')}
              </Button>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoLine({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className={`truncate ${mono ? 'font-mono' : ''}`}>{value ?? ''}</span>
    </div>
  );
}

function TimelineEntry({ icon, label, who, when }: { icon: React.ReactNode; label: string; who?: string | null; when?: string | null }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="shrink-0">{label}:</span>
      <span className="font-medium">{who ?? ''}</span>
      {when && <span className="opacity-60 text-[11px]">{new Date(when).toLocaleString()}</span>}
    </div>
  );
}

function extractSpecialNote(note: string | null | undefined, addLabel: string, deductLabel: string) {
  if (!note) return null;

  const line = note
    .split('\n')
    .map((part) => part.trim())
    .find((part) => part.includes(addLabel) || part.includes(deductLabel));

  if (!line) return null;

  const match = line.match(/(\d+):\s*(.+)$/);
  if (!match) return null;

  const points = Number(match[1]);
  if (!Number.isFinite(points) || points <= 0) return null;

  return {
    line,
    points,
    reason: match[2].trim(),
    type: line.includes(deductLabel) ? 'deduct' as const : 'add' as const,
  };
}

function splitMainNote(note: string, specialLine?: string) {
  return note
    .split('\n')
    .map((part) => part.trim())
    .filter((part) => part && part !== specialLine)
    .join('\n');
}
