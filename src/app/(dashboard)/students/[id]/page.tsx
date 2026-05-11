'use client';

import { useCallback, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Edit3, ClipboardPlus, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StudentDetail } from '@/components/features/students/student-detail';
import { StudentForm } from '@/components/features/students/student-form';
import { EvidenceUploader } from '@/components/features/scores/evidence-uploader';
import { getStudent, editStudent, checkStudentViewerRole } from '@/lib/actions/student.action';
import { getCategories, getScoreRecordingAvailability, recordScore } from '@/lib/actions/score.action';
import { getIndividualReport } from '@/lib/actions/report.action';
import { toast } from 'sonner';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';
import { studentPrefixEnum, type StudentInput } from '@/lib/validation/schemas';
import type { ScoreCategory } from '@/types';
import { useSelectedAcademicYearId } from '@/lib/academic-year-selection';
import { useTranslations } from 'next-intl';

const STATUS_OPTIONS = [
  { value: 'active', labelKey: 'statusActive' },
  { value: 'inactive', labelKey: 'statusInactive' },
  { value: 'transferred', labelKey: 'statusTransferred' },
  { value: 'graduated', labelKey: 'statusGraduated' },
  { value: 'suspended', labelKey: 'statusSuspended' },
];

type StudentStatusValue = NonNullable<StudentInput['current_status']>;

interface IndividualReportTransaction {
  id: string;
  recorded_at: string;
  category_name: string;
  points: number;
  note?: string | null;
  recorded_by_name?: string | null;
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

async function uploadEvidenceFiles(transactionId: string, files: File[], fallbackError: string) {
  if (files.length === 0) return;
  const formData = new FormData();
  formData.append('transaction_id', transactionId);
  files.forEach((file) => formData.append('files', file));

  const response = await fetch('/api/upload/evidence', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || fallbackError);
  }
}

export default function StudentDetailPage() {
  const commonT = useTranslations('common');
  const studentT = useTranslations('student');
  const scoreT = useTranslations('score');
  const settingsT = useTranslations('settings');
  const params = useParams();
  const router = useRouter();
  const selectedAcademicYearId = useSelectedAcademicYearId();
  const [student, setStudent] = useState<StudentWithProfile | null>(null);
  const [reportData, setReportData] = useState<IndividualReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [categories, setCategories] = useState<ScoreCategory[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(false);
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
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
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
        return status || commonT('notAvailable');
    }
  }, [commonT, studentT]);

  const loadData = useCallback(async () => {
    const id = params.id as string;
    const [studentRes, reportRes, roleRes, scoreRecordRes] = await Promise.all([
      getStudent(id),
      getIndividualReport(id, selectedAcademicYearId || undefined),
      checkStudentViewerRole(id),
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
  }, [params.id, selectedAcademicYearId, settingsT, studentT]);

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
        await uploadEvidenceFiles(res.data.id, evidenceFiles, studentT('uploadEvidenceFailed'));
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

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus) return;
    if (!student || changingStatus) return;
    setChangingStatus(true);
    try {
      const result = await editStudent(student.id, { current_status: newStatus as StudentStatusValue });
      if (result.success) {
        toast(studentT('statusChangeSuccess'));
        await loadData();
      } else {
        toast(commonT('error'), { description: result.error?.message });
      }
    } catch {
      toast(commonT('error'), { description: studentT('statusChangeFailed') });
    } finally {
      setChangingStatus(false);
    }
  };

  const handleEditStudent = async (formData: StudentInput & { avatar_url?: string }) => {
    if (!student) return;
    const updateData: Parameters<typeof editStudent>[1] = {
      prefix: formData.prefix,
      first_name: formData.first_name,
      last_name: formData.last_name,
      student_id_number: formData.student_id_number,
      classroom_id: formData.classroom_id,
      class_number: formData.class_number,
      avatar_url: formData.avatar_url,
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
    } else {
      throw new Error(result.error?.message || commonT('error'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const canRecordScoreInSelectedYear = canManage && scoreRecordingAvailability?.can_record === true;
  const canEditStudentInSelectedYear = canEditProfile && scoreRecordingAvailability?.can_record === true;
  const scoreActionUnavailableReason = scoreRecordingAvailability?.reason || studentT('currentYearOnly');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">{commonT('loading')}</p></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error || studentT('notFound')}</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {commonT('back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-24 print:space-y-3 print:bg-white print:p-0 print:pb-0 print:text-xs print:text-black sm:p-6 sm:pb-6">
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
                {reportData?.academic_year || '-'}
              </span>
            </p>
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 print:hidden" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold leading-tight print:text-lg sm:text-2xl">{student.prefix}{student.first_name} {student.last_name}</h1>
              <Badge
                variant="outline"
                className={student.current_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}
              >
                {getStatusLabel(student.current_status)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground print:mt-0 print:text-xs">
              {studentT('id')}: <span className="font-mono">{student.student_id_number}</span>
              {student.classroom_name ? ` · ${studentT('classroom')} ${student.classroom_name}` : ''}
            </p>
          </div>
        </div>
        <div className="hidden gap-2 print:hidden sm:flex">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {canManage && (
            <Button
              size="lg"
              disabled={!canRecordScoreInSelectedYear}
              title={canRecordScoreInSelectedYear ? undefined : scoreActionUnavailableReason}
              onClick={() => { setRecordType('deduct'); setRecordCategory(''); setRecordPoints(5); setExtraPoints(0); setExtraReason(''); setRecordNote(''); setEvidenceFiles([]); setShowRecordDialog(true); }}
            >
              <ClipboardPlus className="mr-2 h-4 w-4" />
              {scoreT('recordTitle')}
            </Button>
          )}
          {canEditProfile && (
            <Button
              variant="outline"
              disabled={!canEditStudentInSelectedYear}
              title={canEditStudentInSelectedYear ? undefined : scoreActionUnavailableReason}
              onClick={() => setShowEditForm(true)}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              {studentT('edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur print:hidden sm:hidden">
        <div className={`grid gap-2 ${canManage || canEditProfile ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-1'}`}>
          <Button
            variant="outline"
            size={canManage || canEditProfile ? 'icon-lg' : 'lg'}
            onClick={handlePrint}
            aria-label={studentT('exportPdf')}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            {!(canManage || canEditProfile) && <span>PDF</span>}
          </Button>
          {canManage && (
            <Button
              size="lg"
              disabled={!canRecordScoreInSelectedYear}
              title={canRecordScoreInSelectedYear ? undefined : scoreActionUnavailableReason}
              onClick={() => { setRecordType('deduct'); setRecordCategory(''); setRecordPoints(5); setExtraPoints(0); setExtraReason(''); setRecordNote(''); setEvidenceFiles([]); setShowRecordDialog(true); }}
            >
              <ClipboardPlus className="mr-2 h-4 w-4" />
              {scoreT('recordTitle')}
            </Button>
          )}
          {canEditProfile && (
            <Button
              variant="outline"
              size="lg"
              disabled={!canEditStudentInSelectedYear}
              title={canEditStudentInSelectedYear ? undefined : scoreActionUnavailableReason}
              onClick={() => setShowEditForm(true)}
              aria-label={studentT('edit')}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <StudentDetail student={student} scoreSummary={reportData?.summary} />

      {canChangeStatus && scoreRecordingAvailability?.can_record === true && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">{studentT('manageStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Select
                value={student.current_status}
                onValueChange={handleStatusChange}
                disabled={changingStatus}
                itemToStringLabel={(value) => {
                  const opt = STATUS_OPTIONS.find(o => o.value === value);
                  return opt ? studentT(opt.labelKey) : String(value);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={studentT(opt.labelKey)}>
                      {studentT(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {changingStatus ? studentT('changingStatus') : studentT('changeStatus')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
                      {t.note || '-'}
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

      {canRecordScoreInSelectedYear && (
        <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{scoreT('recordTitle')}</DialogTitle>
            <DialogDescription>
              {student?.prefix}{student?.first_name} {student?.last_name} ({student?.student_id_number})
            </DialogDescription>
          </DialogHeader>

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
              <EvidenceUploader files={evidenceFiles} onChange={setEvidenceFiles} />
            </div>
            )}

            {recordType && recordCategory && !categories.find(c => c.id === recordCategory)?.requires_evidence && evidenceFiles.length > 0 && (
            <div className="space-y-1 rounded-md border p-3">
              <Label>{studentT('evidenceLabel')}</Label>
              <EvidenceUploader files={evidenceFiles} onChange={setEvidenceFiles} />
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

          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRecordDialog(false)}
              className="h-14 w-full px-4 text-base font-semibold"
            >
              {commonT('cancel')}
            </Button>
            <Button
              onClick={handleRecordScore}
              disabled={!recordType || !recordCategory || recordPoints <= 0 || (categories.find(c => c.id === recordCategory)?.requires_evidence && evidenceFiles.length === 0) || (extraPoints > 0 && !extraReason.trim()) || recording}
              className="h-14 w-full px-4 text-base font-semibold"
            >
              {recording && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {commonT('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Edit Dialog */}
      {canEditStudentInSelectedYear && (
      <Dialog open={showEditForm} onOpenChange={(open) => !open && setShowEditForm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{studentT('edit')}</DialogTitle>
            <DialogDescription>
              {studentT('editDescription')}
            </DialogDescription>
          </DialogHeader>
          <StudentForm
            defaultValues={{
              prefix: normalizeStudentPrefix(student.prefix),
              first_name: student.first_name,
              last_name: student.last_name,
              student_id_number: student.student_id_number,
              classroom_id: student.classroom_id,
              class_number: 1,
              avatar_url: student.avatar_url || '',
              current_status: canChangeStatus ? student.current_status : undefined,
              guardian_full_name: student.guardian_full_name || '',
              guardian_relation: normalizeGuardianRelation(student.guardian_relation),
              guardian_phone: student.guardian_phone || '',
            }}
            onSubmit={handleEditStudent}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
