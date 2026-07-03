'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowLeft, AlertCircle, Edit3, ClipboardPlus, Loader2, Printer, KeyRound, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StudentDetail } from '@/components/features/students/student-detail';
import { StudentForm, type SubmitResult } from '@/components/features/students/student-form';
import { EvidenceUploader, type EvidenceFile } from '@/components/features/scores/evidence-uploader';
import { getStudent, editStudent, checkStudentViewerRole, resetStudentPassword } from '@/lib/actions/student.action';
import { getCategories, getScoreRecordingAvailability, recordScore } from '@/lib/actions/score.action';
import { getIndividualReport } from '@/lib/actions/report.action';
import { toast } from 'sonner';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';
import { studentPrefixEnum, type StudentInput } from '@/lib/validation/schemas';
import type { ScoreCategory } from '@/types';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { useTranslations } from 'next-intl';

interface StudentDetailDialogProps {
  studentId: string;
  onClose: () => void;
}

interface IndividualReportTransaction {
  id: string;
  recorded_at: string;
  category_name: string;
  points: number;
  note?: string | null;
  recorded_by_name?: string | null;
  evidence?: Array<{ id: string; file_url: string; file_name: string }>;
}

interface IndividualReportData {
  academic_year?: string;
  summary?: {
    current_score: number;
    total_deducted: number;
    total_added: number;
    base_score?: number;
  };
  transactions?: IndividualReportTransaction[];
}

function normalizeStudentPrefix(value?: string): StudentInput['prefix'] {
  return studentPrefixEnum.includes(value as StudentInput['prefix'])
    ? value as StudentInput['prefix']
    : 'เด็กชาย';
}

function normalizeGuardianRelation(value?: string): StudentInput['guardian_relation'] {
  const validRelations: NonNullable<StudentInput['guardian_relation']>[] = ['father', 'mother', 'guardian', 'relative', 'other'];
  return value && validRelations.includes(value as NonNullable<StudentInput['guardian_relation']>)
    ? value as StudentInput['guardian_relation']
    : 'guardian';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatPrintDate(value: Date) {
  return value.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function uploadEvidenceFiles(
  transactionId: string,
  evidenceFiles: EvidenceFile[],
  onProgress: (index: number, status: EvidenceFile['status']) => void,
  formatUploadError: (index: number) => string,
) {
  if (evidenceFiles.length === 0) return;
  // Upload files one by one with progress
  for (let i = 0; i < evidenceFiles.length; i++) {
    onProgress(i, 'uploading');
    try {
      const formData = new FormData();
      formData.append('transaction_id', transactionId);
      formData.append('files', evidenceFiles[i].file);
      const response = await fetch('/api/upload/evidence', { method: 'POST', body: formData });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(typeof payload?.error === 'string' ? payload.error : '');
      }
      onProgress(i, 'done');
    } catch {
      onProgress(i, 'error');
      throw new Error(formatUploadError(i + 1));
    }
  }
}

export function StudentDetailDialog({ studentId, onClose }: StudentDetailDialogProps) {
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const scoreT = useTranslations('score');
  const settingsT = useTranslations('settings');
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [student, setStudent] = useState<StudentWithProfile | null>(null);
  const [reportData, setReportData] = useState<IndividualReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);
  const [categories, setCategories] = useState<ScoreCategory[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(false);
  const [canResetPassword, setCanResetPassword] = useState(false);
  const [canChangeStatus, setCanChangeStatus] = useState(false);
  const [scoreRecordingAvailability, setScoreRecordingAvailability] = useState<{
    can_record: boolean;
    reason: string;
  } | null>(null);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [recordType, setRecordType] = useState<'deduct' | 'add'>('deduct');
  const [recordCategory, setRecordCategory] = useState('');
  const [recordPoints, setRecordPoints] = useState(5);
  const [extraPoints, setExtraPoints] = useState(0);
  const [extraReason, setExtraReason] = useState('');
  const [recordNote, setRecordNote] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [recording, setRecording] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCloseDetail = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleModalOpenChange = useCallback((open: boolean) => {
    if (!open) handleCloseDetail();
  }, [handleCloseDetail]);

  const getStatusLabel = useCallback((status?: string | null) => {
    switch (status) {
      case 'active':
        return studentT('statusActive');
      case 'inactive':
        return studentT('statusInactive');
      case 'transferred':
        return studentT('statusTransferred');
      case 'graduated':
        return studentT('statusGraduated');
      case 'suspended':
        return studentT('statusSuspended');
      default:
        return status ?? '';
    }
  }, [studentT]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setStudent(null);
    setReportData(null);
    const [studentRes, reportRes, roleRes, scoreRecordRes] = await Promise.all([
      getStudent(studentId),
      getIndividualReport(studentId, selectedAcademicYearId || undefined),
      checkStudentViewerRole(studentId),
      getScoreRecordingAvailability(selectedAcademicYearId || undefined),
    ]);

    if (studentRes.success && studentRes.data) {
      setStudent(studentRes.data as StudentWithProfile);
    } else {
      setError(studentT('notFound'));
    }

    if (reportRes.success && reportRes.data) {
      setReportData(reportRes.data);
    }

    if (roleRes.success && roleRes.data) {
      setCanManage(roleRes.data.canManage);
      setCanEditProfile(Boolean(roleRes.data.canEditProfile));
      setCanResetPassword(Boolean(roleRes.data.canResetPassword));
      setCanChangeStatus(Boolean(roleRes.data.canChangeStatus));
    }

    if (scoreRecordRes.success && scoreRecordRes.data) {
      setScoreRecordingAvailability({
        can_record: scoreRecordRes.data.can_record,
        reason: scoreRecordRes.data.reason,
      });
    } else {
      setScoreRecordingAvailability({ can_record: false, reason: settingsT('academicYearAvailabilityCheckFailed') });
    }
  }, [selectedAcademicYearId, settingsT, studentId, studentT]);

  useEffect(() => {
    async function load() {
      await loadData();
      // Load categories for score recording
      const catRes = await getCategories();
      if (catRes.success && catRes.data) setCategories(catRes.data);
      setLoading(false);
    }
    void Promise.resolve().then(load);
  }, [loadData]);

  const handleRecordScore = async () => {
    if (!student || !recordCategory || recordPoints <= 0) return;
    const cat = categories.find(c => c.id === recordCategory);
    if (cat?.requires_evidence && evidenceFiles.length === 0) {
      toast(studentT('evidenceRequiredToastTitle'), { description: studentT('evidenceRequiredToastDescription') });
      return;
    }
    if (!Number.isInteger(extraPoints) || extraPoints < 0 || extraPoints > 999) {
      toast(studentT('extraPointsInvalid'));
      return;
    }
    if (extraPoints > 0 && !extraReason.trim()) {
      toast(studentT('extraReasonRequired'));
      return;
    }
    const totalPoints = Math.abs(recordPoints) + extraPoints;
    if (totalPoints > 999) {
      toast(studentT('totalPointsTooHigh'));
      return;
    }
    setRecording(true);
    try {
      const basePoints = Math.abs(recordPoints);
      const specialPoints = extraPoints;
      const points = cat?.type === 'deduct' ? -(basePoints + specialPoints) : basePoints + specialPoints;
      const noteParts = [
        recordNote.trim(),
        specialPoints > 0 ? studentT('specialPointsNote', {
          type: cat?.type === 'deduct' ? studentT('specialDeduct') : studentT('specialAdd'),
          points: specialPoints,
          reason: extraReason.trim(),
        }) : '',
      ].filter(Boolean);
      const res = await recordScore({
        student_id: student.id,
        category_id: recordCategory,
        points,
        academic_year_id: selectedAcademicYearId || undefined,
        note: noteParts.join('\n') || undefined,
        has_evidence: evidenceFiles.length > 0,
      });
      if (res.success) {
        await uploadEvidenceFiles(
          res.data.id,
          evidenceFiles,
          (index, status) => {
            setEvidenceFiles(prev => prev.map((f, i) => i === index ? { ...f, status } : f));
          },
          (index) => studentT('evidenceUploadFailedItem', { index }),
        );
        toast(cat?.requires_approval ? studentT('scoreSubmittedApproval') : studentT('scoreRecordSuccess'));
        setShowRecordDialog(false);
        setRecordType('deduct');
        setRecordCategory('');
        setRecordPoints(5);
        setExtraPoints(0);
        setExtraReason('');
        setRecordNote('');
        setEvidenceFiles([]);
        await loadData();
      } else {
        toast(commonT('error'), { description: res.error?.message });
      }
    } catch {
      toast(commonT('error'));
    } finally {
      setRecording(false);
    }
  };

  const handleResetPassword = async () => {
    if (!student) return;
    setResettingPassword(true);
    try {
      const res = await resetStudentPassword(student.id);
      if (res.success) {
        setShowRecordDialog(false);
        setShowEditForm(false);
        setResetPasswordResult(res.data.temporary_password);
      } else {
        toast(commonT('error'), { description: res.error?.message });
      }
    } catch {
      toast(commonT('error'));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleEditStudent = async (formData: StudentInput & { avatar_url?: string }): Promise<SubmitResult | undefined> => {
    if (!student) return;
    const updateData: Parameters<typeof editStudent>[1] = {
      prefix: formData.prefix,
      first_name: formData.first_name,
      last_name: formData.last_name,
      student_id_number: formData.student_id_number,
      classroom_id: formData.classroom_id,
      class_number: formData.class_number,
      avatar_url: formData.avatar_url,
      guardian_prefix: formData.guardian_prefix,
      guardian_first_name: formData.guardian_first_name,
      guardian_last_name: formData.guardian_last_name,
      guardian_full_name: formData.guardian_full_name,
      guardian_relation: formData.guardian_relation,
      guardian_phone: formData.guardian_phone,
    };

    if (canChangeStatus) {
      updateData.current_status = formData.current_status;
    }

    const result = await editStudent(student.id, {
      ...updateData,
    });

    if (result.success) {
      setShowEditForm(false);
      toast(studentT('editSuccess'));
      await loadData();
      return;
    }

    if (result.error?.code === 'DUPLICATE_CLASS_NUMBER') {
      return { fieldErrors: { class_number: result.error.message } };
    }

    if (result.error?.code === 'DUPLICATE_STUDENT_ID') {
      return { fieldErrors: { student_id_number: result.error.message } };
    }

    throw new Error(result.error?.message || commonT('error'));
  };

  const handlePrint = () => {
    window.print();
  };

  const openRecordPanel = () => {
    setShowEditForm(false);
    setResetPasswordResult(null);
    setRecordType('deduct');
    setRecordCategory('');
    setRecordPoints(5);
    setExtraPoints(0);
    setExtraReason('');
    setRecordNote('');
    setEvidenceFiles([]);
    setShowRecordDialog(true);
  };

  const openEditPanel = () => {
    setShowRecordDialog(false);
    setResetPasswordResult(null);
    setShowEditForm(true);
  };

  const canRecordScoreInSelectedYear = canManage && scoreRecordingAvailability?.can_record === true;
  const canEditStudentInSelectedYear = canChangeStatus && scoreRecordingAvailability?.can_record === true;
  const scoreActionUnavailableReason = scoreRecordingAvailability?.reason || studentT('currentYearOnly');
  const hasActiveActionPanel = showRecordDialog || showEditForm || Boolean(resetPasswordResult);

  useEffect(() => {
    if (!hasActiveActionPanel) return;
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [hasActiveActionPanel]);

  if (loading) {
    return (
      <Dialog open onOpenChange={handleModalOpenChange}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] max-w-3xl p-0 sm:max-w-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{studentT('detail')}</DialogTitle>
          </DialogHeader>
          <div className="flex min-h-[320px] items-center justify-center p-6">
            <div className="flex flex-col items-center gap-2">
              <Spinner className="size-8" />
              <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !student) {
    return (
      <Dialog open onOpenChange={handleModalOpenChange}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] max-w-md p-0 sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>{studentT('detail')}</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error || studentT('notFound')}</span>
            </div>
            <Button variant="outline" className="mt-4" onClick={handleCloseDetail}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {commonT('back')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={handleModalOpenChange}>
      <DialogContent showCloseButton={false} className="h-dvh w-screen max-w-none overflow-hidden rounded-none p-0 print:static print:h-auto print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:overflow-visible print:rounded-none print:bg-white print:ring-0 sm:h-[min(94dvh,940px)] sm:w-[calc(100vw-1rem)] sm:max-w-7xl sm:rounded-xl">
        <div className="flex h-full flex-col print:block">
          <DialogHeader className="border-b bg-background px-4 py-3 print:hidden sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={handleCloseDetail}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {student.avatar_url ? (
                  <Image
                    src={student.avatar_url}
                    alt={studentT('studentPhotoAlt', { name: `${student.prefix}${student.first_name} ${student.last_name}` })}
                    width={48}
                    height={48}
                    unoptimized
                    className="size-12 shrink-0 rounded-md border object-cover"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-semibold text-muted-foreground">
                    {student.first_name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="truncate text-xl font-bold leading-tight">
                      {student.prefix}{student.first_name} {student.last_name}
                    </DialogTitle>
                    <Badge
                      variant="outline"
                      className={student.current_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}
                    >
                      {getStatusLabel(student.current_status)}
                    </Badge>
                  </div>
                  <DialogDescription className="mt-1">
                    {studentT('id')}: <span className="font-mono">{student.student_id_number}</span>
                    {student.classroom_name ? ` · ${studentT('classroom')} ${student.classroom_name}` : ''}
                  </DialogDescription>
                </div>
              </div>
              <div className="hidden flex-wrap gap-2 pl-12 sm:pl-16 lg:flex lg:pl-0">
                <Button type="button" variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  {studentT('exportPdf')}
                </Button>
                {canManage && (
                  <Button
                    type="button"
                    disabled={!canRecordScoreInSelectedYear}
                    title={canRecordScoreInSelectedYear ? undefined : scoreActionUnavailableReason}
                    onClick={openRecordPanel}
                  >
                    <ClipboardPlus className="mr-2 h-4 w-4" />
                    {scoreT('recordTitle')}
                  </Button>
                )}
                {canChangeStatus && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canEditStudentInSelectedYear}
                    title={canEditStudentInSelectedYear ? undefined : scoreActionUnavailableReason}
                    onClick={openEditPanel}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    {studentT('edit')}
                  </Button>
                )}
                {canResetPassword && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={resettingPassword}
                    onClick={handleResetPassword}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    {resettingPassword ? commonT('processing') : studentT('resetPasswordAction')}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto print:h-auto print:overflow-visible">
          <div className={`flex flex-col gap-5 p-4 print:space-y-3 print:bg-white print:p-0 print:pb-0 print:text-xs print:text-black sm:p-5 ${hasActiveActionPanel ? 'pb-6 sm:pb-6' : 'pb-24 sm:pb-24 lg:pb-6'}`}>
      <div className="hidden border-b border-neutral-300 pb-3 print:block">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium text-neutral-500">{studentT('reportTitle')}</p>
            <h1 className="mt-1 text-xl font-bold leading-tight">
              {student.prefix}{student.first_name} {student.last_name}
            </h1>
            <p className="mt-1 text-[11px] text-neutral-600">
              {studentT('id')} {student.student_id_number}
              {student.classroom_name ? ` | ${studentT('classroom')} ${student.classroom_name}` : ''}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-600">
              {studentT('printedDate')} {formatPrintDate(new Date())}
            </p>
          </div>
          <div className="text-right text-[11px] text-neutral-600">
            <p className="whitespace-nowrap font-medium">
              {commonT('academicYear')}{' '}
              <span className="text-2xl font-bold leading-none text-neutral-900">
                {reportData?.academic_year ?? ''}
              </span>
            </p>
          </div>
        </div>
      </div>
      {!hasActiveActionPanel && (
      <div className="absolute inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur print:hidden lg:hidden">
        <div className={`grid gap-2 ${canManage || canEditProfile ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-1'}`}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrint}
            aria-label={studentT('exportPdf')}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
          </Button>
          {canManage && (
            <Button
              type="button"
              disabled={!canRecordScoreInSelectedYear}
              title={canRecordScoreInSelectedYear ? undefined : scoreActionUnavailableReason}
              onClick={openRecordPanel}
            >
              <ClipboardPlus className="mr-2 h-4 w-4" />
              {scoreT('recordTitle')}
            </Button>
          )}
          {canChangeStatus && (
            <Button
              type="button"
              variant="outline"
              disabled={!canEditStudentInSelectedYear}
              title={canEditStudentInSelectedYear ? undefined : scoreActionUnavailableReason}
              onClick={openEditPanel}
              aria-label={studentT('edit')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
          {canResetPassword && (
            <Button
              type="button"
              variant="outline"
              disabled={resettingPassword}
              onClick={handleResetPassword}
              aria-label={studentT('resetPasswordAction')}
            >
              <KeyRound className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      )}

      <StudentDetail student={student} scoreSummary={reportData?.summary} />

      {/* Score History */}
      {reportData?.transactions && reportData.transactions.length > 0 && (
        <Card className="print:break-inside-avoid print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
          <CardHeader className="print:border-b print:bg-neutral-50 print:px-3 print:py-2">
            <CardTitle className="text-lg print:text-[12px] print:font-semibold">{studentT('scoreHistoryLatest')}</CardTitle>
          </CardHeader>
          <CardContent className="print:px-3 print:py-2">
            <div className="overflow-x-auto print:overflow-visible">
            <Table className="print:text-[10px] print:[&_td]:border print:[&_td]:border-neutral-300 print:[&_td]:px-2 print:[&_td]:py-1.5 print:[&_th]:border print:[&_th]:border-neutral-300 print:[&_th]:bg-neutral-100 print:[&_th]:px-2 print:[&_th]:py-1.5">
              <TableHeader>
                <TableRow>
                  <TableHead>{scoreT('date')}</TableHead>
                  <TableHead>{scoreT('type')}</TableHead>
                  <TableHead>{scoreT('points')}</TableHead>
                  <TableHead>{studentT('note')}</TableHead>
                  <TableHead>{scoreT('recordedBy')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.transactions.slice(0, 8).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">
                      {formatDateTime(t.recorded_at)}
                    </TableCell>
                    <TableCell>{t.category_name}</TableCell>
                    <TableCell>
                      <span className={t.points > 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate print:max-w-none print:whitespace-normal print:text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>{t.note ?? ''}</span>
                        {t.evidence && t.evidence.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {t.evidence.map((e) => (
                              <a key={e.id} href={e.file_url} target="_blank" rel="noopener noreferrer">
                                <Image
                                  src={e.file_url}
                                  alt={e.file_name ?? ''}
                                  width={32}
                                  height={32}
                                  unoptimized
                                  className="size-8 rounded border object-cover hover:ring-2 hover:ring-primary transition-all"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{t.recorded_by_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            {reportData.transactions.length > 8 && (
              <p className="mt-1 hidden text-[10px] text-muted-foreground print:block">
                {studentT('showLatestTransactions', { count: reportData.transactions.length })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(!reportData?.transactions || reportData.transactions.length === 0) && (
        <Card className="print:rounded-md print:border print:border-neutral-300 print:bg-white print:shadow-none">
          <CardContent className="py-8 text-center text-muted-foreground print:py-4 print:text-[11px]">
            {studentT('noScoreHistory')}
          </CardContent>
        </Card>
      )}

      {canRecordScoreInSelectedYear && showRecordDialog && (
        <Card className="order-first border-primary/30 print:hidden">
          <CardHeader>
            <CardTitle>{scoreT('recordTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {student?.prefix}{student?.first_name} {student?.last_name} ({student?.student_id_number})
            </p>
          </CardHeader>
          <CardContent>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{studentT('scoreRecordType')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setRecordType('deduct'); setRecordCategory(''); setRecordPoints(5); setExtraPoints(0); setExtraReason(''); }}
                  className={`rounded-md border px-3 py-3 text-sm font-semibold transition-all ${
                    recordType === 'deduct'
                      ? 'border-red-500 bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200'
                      : 'border-red-200 bg-red-50/40 text-red-700 hover:bg-red-50'
                  }`}
                >
                  {studentT('deductScore')}
                </button>
                <button
                  type="button"
                  onClick={() => { setRecordType('add'); setRecordCategory(''); setRecordPoints(5); setExtraPoints(0); setExtraReason(''); }}
                  className={`rounded-md border px-3 py-3 text-sm font-semibold transition-all ${
                    recordType === 'add'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200'
                      : 'border-emerald-200 bg-emerald-50/40 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {studentT('addScore')}
                </button>
              </div>
            </div>

            {recordType && (
            <div className="space-y-1">
              <Label className={`text-xs font-medium ${recordType === 'deduct' ? 'text-red-700' : 'text-emerald-700'}`}>
                {recordType === 'deduct' ? studentT('selectDeductCategory') : studentT('selectAddCategory')}
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {categories.filter(c => c.type === recordType).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setRecordCategory(c.id); setRecordPoints(Math.abs(c.default_points)); }}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-all ${
                      recordCategory === c.id
                        ? recordType === 'deduct'
                          ? 'border-red-500 bg-red-50 text-red-700 font-semibold ring-1 ring-red-200'
                          : 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold ring-1 ring-emerald-200'
                        : recordType === 'deduct'
                          ? 'border-red-100 hover:bg-red-50'
                          : 'border-emerald-100 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="flex-1 truncate text-left">
                      {c.name}
                      {(c.requires_evidence || c.requires_approval) && (
                        <span className="mt-0.5 block text-xs font-normal opacity-75">
                          {[
                            c.requires_evidence ? studentT('requiresEvidenceShort') : '',
                            c.requires_approval ? studentT('requiresApprovalShort') : '',
                          ].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </span>
                    <span className="font-mono shrink-0">
                      {recordType === 'deduct' ? '-' : '+'}{Math.abs(c.default_points)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            )}

            {recordType && recordCategory && categories.find(c => c.id === recordCategory)?.requires_evidence && (
            <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50/60 p-3">
              <Label>{studentT('evidenceRequiredLabel')}</Label>
              <EvidenceUploader files={evidenceFiles} onChange={setEvidenceFiles} uploading={recording} />
            </div>
            )}

            {recordType && recordCategory && !categories.find(c => c.id === recordCategory)?.requires_evidence && evidenceFiles.length > 0 && (
            <div className="space-y-1 rounded-md border p-3">
              <Label>{studentT('evidenceLabel')}</Label>
              <EvidenceUploader files={evidenceFiles} onChange={setEvidenceFiles} uploading={recording} />
            </div>
            )}

            {recordType && (
            <div className="space-y-1">
              <Label>{studentT('categoryPoints')}</Label>
              <div className={`inline-flex rounded-md border px-3 py-2 text-sm font-semibold ${
                recordType === 'deduct'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}>
                {recordType === 'deduct' ? '-' : '+'}{recordPoints}
              </div>
            </div>
            )}

            {recordType && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label>{recordType === 'deduct' ? studentT('extraDeductPoints') : studentT('extraAddPoints')}</Label>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  max={999}
                  value={extraPoints === 0 ? '' : extraPoints}
                  placeholder="0"
                  onChange={e => {
                    if (e.target.value === '') {
                      setExtraPoints(0);
                      return;
                    }
                    const next = Number(e.target.value);
                    setExtraPoints(Number.isFinite(next) ? Math.max(0, Math.trunc(next)) : 0);
                  }}
                  className={`w-28 font-semibold ${
                    recordType === 'deduct'
                      ? 'border-red-200 text-red-700 focus-visible:ring-red-200'
                      : 'border-emerald-200 text-emerald-700 focus-visible:ring-emerald-200'
                  }`}
                />
              </div>
              {extraPoints > 0 && (
                <div className="space-y-1">
                  <Label>{studentT('extraReason')}</Label>
                  <Textarea
                    value={extraReason}
                    onChange={e => setExtraReason(e.target.value)}
                    placeholder={recordType === 'deduct' ? studentT('extraDeductReasonPlaceholder') : studentT('extraAddReasonPlaceholder')}
                    rows={2}
                  />
                </div>
              )}
            </div>
            )}

            {recordType && (
            <div className="space-y-1">
              <Label>{studentT('note')}</Label>
              <Textarea
                value={recordNote}
                onChange={e => setRecordNote(e.target.value)}
                placeholder={studentT('notePlaceholder')}
                rows={2}
              />
            </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 border-t pt-4 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => setShowRecordDialog(false)}
              className="h-12 w-full px-4 text-base font-semibold"
            >
              {commonT('cancel')}
            </Button>
            <Button
              onClick={handleRecordScore}
              disabled={!recordType || !recordCategory || recordPoints <= 0 || (categories.find(c => c.id === recordCategory)?.requires_evidence && evidenceFiles.length === 0) || (extraPoints > 0 && !extraReason.trim()) || recording}
              className="h-12 w-full px-4 text-base font-semibold"
            >
              {recording && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {commonT('save')}
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {canEditStudentInSelectedYear && showEditForm && (
        <Card className="order-first border-primary/30 print:hidden">
          <CardHeader>
            <CardTitle>{studentT('edit')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {studentT('editDescription')}
            </p>
          </CardHeader>
          <CardContent>
          <StudentForm
            defaultValues={{
              prefix: normalizeStudentPrefix(student.prefix),
              first_name: student.first_name,
              last_name: student.last_name,
              student_id_number: student.student_id_number,
              classroom_id: student.classroom_id,
              class_number: 1,
              avatar_url: student.avatar_url ?? '',
              current_status: canChangeStatus ? student.current_status : undefined,
              guardian_full_name: student.guardian_full_name ?? '',
              guardian_relation: normalizeGuardianRelation(student.guardian_relation),
              guardian_phone: student.guardian_phone ?? '',
            }}
            onSubmit={handleEditStudent}
            onCancel={() => setShowEditForm(false)}
          />
          </CardContent>
        </Card>
      )}

      {resetPasswordResult && (
        <Card className="order-first border-green-200 print:hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {studentT('passwordResetSuccess')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {studentT('resetPasswordTempDescription', {
                name: `${student?.prefix ?? ''}${student?.first_name ?? ''} ${student?.last_name ?? ''}`.trim(),
              })}
            </p>
          </CardHeader>
          <CardContent>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <code className="flex-1 text-lg font-bold tracking-wider text-center select-all">{resetPasswordResult}</code>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  if (resetPasswordResult) navigator.clipboard.writeText(resetPasswordResult);
                  toast(studentT('passwordCopied'));
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="border-t pt-4">
            <Button onClick={() => setResetPasswordResult(null)} className="w-full sm:w-auto">{commonT('close')}</Button>
          </div>
          </CardContent>
        </Card>
      )}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
