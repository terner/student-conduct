'use server';

import { withAuth } from '@/lib/server-action';
import {
  listScoreTransactions,
  getScoreSummary,
  createScoreTransaction,
  voidScoreTransaction,
  approveScoreTransaction,
  getScoreCategories,
  upsertScoreCategory,
  deactivateScoreCategory,
  getRecentTransactions,
  getScoreDistribution,
} from '@/lib/db';
import { scoreRecordSchema, scoreCategorySchema, scoreVoidSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { canApproveScores, canRecordScores } from '@/lib/security/roles';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';
import { logAudit } from '@/lib/audit/log';
import { notifyThresholdReached } from '@/lib/notifications/threshold';
import { notifyScoreApprovalPending, resolveScoreApprovalPendingNotifications } from '@/lib/notifications/score-approval';
import { serverMessage } from '@/lib/i18n/server';

const MASTER_DATA_TTL_MS = 10 * 60 * 1000;

function todayInBangkok() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

async function getAcademicYearClosedReason(year: {
  start_date?: string | null;
  end_date?: string | null;
}, today = todayInBangkok()) {
  if (year.start_date && today < year.start_date) {
    return serverMessage('apiErrors.academicYearNotStarted', { date: year.start_date });
  }
  if (year.end_date && today > year.end_date) {
    return serverMessage('apiErrors.academicYearEnded', { date: year.end_date });
  }
  return '';
}

async function resolveAcademicYearForScoring(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  academicYearId?: string,
) {
  if (academicYearId) {
    const { data, error } = await supabase
      .from('academic_years')
      .select('id, name, start_date, end_date, is_current')
      .eq('id', academicYearId)
      .maybeSingle();

    if (error) throw error;
    if (data?.id) return data;
  }

  const { data, error } = await supabase
    .from('academic_years')
    .select('id, name, start_date, end_date, is_current')
    .eq('is_current', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureAcademicYearOpenForScoring(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  academicYearId?: string,
) {
  const academicYear = await resolveAcademicYearForScoring(supabase, academicYearId);
  if (!academicYear?.id) {
    return {
      success: false as const,
      error: { code: 'NO_CURRENT_YEAR', message: await serverMessage('apiErrors.noCurrentAcademicYear') },
    };
  }

  if (!academicYear.is_current) {
    return {
      success: false as const,
      error: { code: 'ACADEMIC_YEAR_NOT_CURRENT', message: await serverMessage('apiErrors.scoreCurrentYearOnly') },
      academicYear,
    };
  }

  const closedReason = await getAcademicYearClosedReason(academicYear);
  if (closedReason) {
    return {
      success: false as const,
      error: { code: 'ACADEMIC_YEAR_CLOSED', message: await serverMessage('apiErrors.scoreRecordClosedAcademicYear', { reason: closedReason }) },
      academicYear,
    };
  }

  return { success: true as const, academicYear };
}

export async function getScoreRecordingAvailability(academicYearId?: string) {
  return withAuth(async (profile) => {
    if (!canRecordScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.scoreRecordForbidden') } };
    }

    const supabase = await createAdminClient();
    const academicYear = await resolveAcademicYearForScoring(supabase, academicYearId);
    if (!academicYear?.id) {
      return { success: false, error: { code: 'NO_CURRENT_YEAR', message: await serverMessage('apiErrors.noCurrentAcademicYear') } };
    }

    const closedReason = await getAcademicYearClosedReason(academicYear);
    const notCurrentReason = academicYear.is_current ? '' : await serverMessage('apiErrors.scoreCurrentYearOnly');
    return {
      success: true,
      data: {
        academic_year_id: academicYear.id as string,
        academic_year_name: academicYear.name as string,
        can_record: !notCurrentReason && !closedReason,
        reason: notCurrentReason || closedReason,
        start_date: (academicYear.start_date as string | null) || null,
        end_date: (academicYear.end_date as string | null) || null,
      },
    };
  });
}

export async function getScores(params: {
  page?: number;
  page_size?: number;
  student_id?: string;
  classroom_id?: string;
  category_id?: string;
  status?: string;
  academic_year_id?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}) {
  return withAuth(async (profile) => {
    if (!canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.scoreHistoryForbidden') } };
    }

    const result = await listScoreTransactions(params);
    await logAudit({
      actorId: profile.id,
      action: 'score_transactions_view',
      targetType: 'score_transaction',
      afterData: {
        page: params.page,
        page_size: params.page_size,
        total: result.total,
      },
      metadata: {
        filters: {
          student_id: params.student_id,
          classroom_id: params.classroom_id,
          category_id: params.category_id,
          status: params.status,
          academic_year_id: params.academic_year_id,
          from_date: params.from_date,
          to_date: params.to_date,
          search: params.search ? '[provided]' : undefined,
        },
      },
    });
    return { success: true, data: result };
  });
}

export async function recordScore(data: {
  student_id: string;
  category_id: string;
  points: number;
  academic_year_id?: string;
  note?: string;
  has_evidence?: boolean;
}) {
  return withAuth(async (profile) => {
    if (!canRecordScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.scoreRecordForbidden') } };
    }

    const validated = scoreRecordSchema.parse(data);

    const xssCheck = validateXSS({ note: validated.note || '' });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: await serverMessage('apiErrors.xssDetected') } };
    }

    const supabase = await createAdminClient();

    let academicYearId = data.academic_year_id;
    const openYearResult = await ensureAcademicYearOpenForScoring(supabase, academicYearId);
    if (!openYearResult.success) return openYearResult;
    academicYearId = openYearResult.academicYear.id as string;

    if (academicYearId) {
      const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('student_id', validated.student_id)
        .eq('academic_year_id', academicYearId)
        .maybeSingle();

      if (!enrollment) {
        return { success: false, error: { code: 'INVALID_ACADEMIC_YEAR', message: await serverMessage('apiErrors.invalidStudentAcademicYear') } };
      }
    }

    // Check if category requires approval
    const { data: category } = await supabase
      .from('score_categories')
      .select('name, type, requires_approval, requires_evidence')
      .eq('id', validated.category_id)
      .single();

    if (category?.requires_evidence && !data.has_evidence) {
      return { success: false, error: { code: 'EVIDENCE_REQUIRED', message: await serverMessage('apiErrors.scoreEvidenceRequired') } };
    }

    const result = await createScoreTransaction({
      student_id: validated.student_id,
      category_id: validated.category_id,
      points: validated.points,
      note: validated.note || undefined,
      recorded_by: profile.id,
      academic_year_id: academicYearId,
      requires_approval: category?.requires_approval || false,
      requires_evidence: category?.requires_evidence || false,
      category_name: category?.name || '',
      category_type: category?.type || undefined,
    });

    await logAudit({
      actorId: profile.id,
      action: category?.requires_approval ? 'score_create_pending' : 'score_create',
      targetType: 'score_transaction',
      targetId: result.id,
      afterData: result,
      metadata: {
        student_id: validated.student_id,
        category_id: validated.category_id,
        academic_year_id: academicYearId,
      },
    });

    if (!category?.requires_approval && validated.points < 0) {
      await notifyThresholdReached({
        studentId: validated.student_id,
        academicYearId,
        transactionId: result.id,
      });
    }
    if (category?.requires_approval) {
      await notifyScoreApprovalPending({
        transactionId: result.id,
        studentId: validated.student_id,
        academicYearId,
        points: validated.points,
        categoryName: category?.name || null,
      });
    }

    return { success: true, data: result };
  });
}

export async function recordBulkScore(data: {
  student_ids: string[];
  category_id: string;
  points: number;
  note?: string;
}) {
  return withAuth(async (profile) => {
    if (!canRecordScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.scoreRecordForbidden') } };
    }

    const supabase = await createClient();

    const openYearResult = await ensureAcademicYearOpenForScoring(supabase);
    if (!openYearResult.success) return openYearResult;

    const { data: category } = await supabase
      .from('score_categories')
      .select('name, type, requires_approval, requires_evidence')
      .eq('id', data.category_id)
      .single();

    if (category?.requires_evidence) {
      return { success: false, error: { code: 'EVIDENCE_REQUIRED', message: await serverMessage('apiErrors.scoreBulkEvidenceUnsupported') } };
    }

    const results = [];
    for (const studentId of data.student_ids) {
      const result = await createScoreTransaction({
        student_id: studentId,
        category_id: data.category_id,
        points: data.points,
        note: data.note || undefined,
        recorded_by: profile.id,
        academic_year_id: openYearResult.academicYear.id as string,
        requires_approval: category?.requires_approval || false,
        requires_evidence: category?.requires_evidence || false,
        category_name: category?.name || '',
        category_type: category?.type || undefined,
      });
      results.push(result);
      if (category?.requires_approval) {
        await notifyScoreApprovalPending({
          transactionId: result.id,
          studentId,
          academicYearId: openYearResult.academicYear.id as string,
          points: data.points,
          categoryName: category?.name || null,
        });
      }
    }

    await logAudit({
      actorId: profile.id,
      action: 'score_bulk_create',
      targetType: 'score_transaction',
      afterData: { count: results.length },
      metadata: {
        student_ids: data.student_ids,
        category_id: data.category_id,
        academic_year_id: openYearResult.academicYear.id,
      },
    });

    return { success: true, data: { count: results.length } };
  });
}

export async function voidScore(transactionId: string, voidReason: string) {
  return withAuth(async (profile) => {
    if (!canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.scoreVoidForbidden') } };
    }

    const validated = scoreVoidSchema.parse({ transaction_id: transactionId, void_reason: voidReason });

    const supabase = await createClient();
    const { data: before } = await supabase
      .from('score_transactions')
      .select('id, status, academic_year_id, student_id, points, voided_at')
      .eq('id', transactionId)
      .maybeSingle();

    if (!before) {
      return { success: false, error: { code: 'NOT_FOUND', message: await serverMessage('apiErrors.scoreTransactionNotFound') } };
    }
    if (before.status === 'voided') {
      return { success: false, error: { code: 'CONFLICT', message: await serverMessage('apiErrors.scoreTransactionAlreadyVoided') } };
    }

    if (before.academic_year_id) {
      const openYearResult = await ensureAcademicYearOpenForScoring(supabase, before.academic_year_id as string);
      if (!openYearResult.success) return openYearResult;
    }

    await voidScoreTransaction(validated.transaction_id, profile.id, validated.void_reason);
    await logAudit({
      actorId: profile.id,
      action: 'score_void',
      targetType: 'score_transaction',
      targetId: transactionId,
      beforeData: before,
      afterData: { status: 'voided', void_reason: validated.void_reason },
    });
    await resolveScoreApprovalPendingNotifications(transactionId);
    return { success: true, data: { transaction_id: transactionId } };
  });
}

export async function approveScore(transactionId: string) {
  return withAuth(async (profile) => {
    if (!canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.scoreApproveForbidden') } };
    }

    const supabase = await createClient();
    const { data: transaction } = await supabase
      .from('score_transactions')
      .select('id, student_id, academic_year_id, points, status, requires_evidence_at_record')
      .eq('id', transactionId)
      .maybeSingle();

    if (!transaction) {
      return { success: false, error: { code: 'NOT_FOUND', message: await serverMessage('apiErrors.scoreTransactionNotFound') } };
    }
    if (transaction.status !== 'pending') {
      return { success: false, error: { code: 'CONFLICT', message: await serverMessage('apiErrors.scoreApprovePendingOnly') } };
    }

    if (transaction.academic_year_id) {
      const openYearResult = await ensureAcademicYearOpenForScoring(supabase, transaction.academic_year_id as string);
      if (!openYearResult.success) return openYearResult;
    }

    if (transaction?.requires_evidence_at_record === true) {
      const { count } = await supabase
        .from('score_transaction_evidence')
        .select('id', { count: 'exact', head: true })
        .eq('transaction_id', transactionId);

      if (!count) {
        return { success: false, error: { code: 'EVIDENCE_REQUIRED', message: await serverMessage('apiErrors.scoreApprovalEvidenceRequired') } };
      }
    }

    await approveScoreTransaction(transactionId, profile.id);
    await logAudit({
      actorId: profile.id,
      action: 'score_approve',
      targetType: 'score_transaction',
      targetId: transactionId,
      beforeData: transaction,
      afterData: { status: 'approved' },
    });
    await resolveScoreApprovalPendingNotifications(transactionId);
    if (transaction && Number(transaction.points) < 0) {
      await notifyThresholdReached({
        studentId: transaction.student_id as string,
        academicYearId: transaction.academic_year_id as string,
        transactionId,
      });
    }
    return { success: true, data: { transaction_id: transactionId } };
  });
}

export async function getStudentSummary(studentId: string) {
  return withAuth(async () => {
    const supabase = await createClient();
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single();

    const summary = await getScoreSummary(studentId, acYear?.id);
    return { success: true, data: summary };
  });
}

export async function getCategories() {
  return withAuth(async () => {
    const cached = await getTtlCache<Awaited<ReturnType<typeof getScoreCategories>>>('score-categories:active');
    if (cached) return { success: true, data: cached };

    const categories = await getScoreCategories();
    await setTtlCache('score-categories:active', categories, MASTER_DATA_TTL_MS);
    return { success: true, data: categories };
  });
}

export async function saveCategory(data: {
  id?: string;
  name: string;
  type: 'deduct' | 'add';
  default_points: number;
  description?: string;
  requires_evidence?: boolean;
  requires_approval?: boolean;
}) {
  return withAuth(async (profile) => {
    if (!canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    const validated = scoreCategorySchema.parse(data);
    const xssCheck = validateXSS({ name: validated.name, description: validated.description || '' });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: await serverMessage('apiErrors.xssDetected') } };
    }

    await upsertScoreCategory(validated);
    await clearTtlCacheByPrefix('score-categories:');
    await logAudit({
      actorId: profile.id,
      action: data.id ? 'score_category_update' : 'score_category_create',
      targetType: 'score_category',
      targetId: data.id,
      afterData: validated,
    });
    return { success: true, data: null };
  });
}

export async function removeCategory(categoryId: string) {
  return withAuth(async (profile) => {
    if (!canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: await serverMessage('apiErrors.superadminOnly') } };
    }

    if (!categoryId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: await serverMessage('apiErrors.scoreCategoryNotFound') } };
    }

    await deactivateScoreCategory(categoryId);
    await clearTtlCacheByPrefix('score-categories:');
    await logAudit({
      actorId: profile.id,
      action: 'score_category_deactivate',
      targetType: 'score_category',
      targetId: categoryId,
      afterData: { is_active: false },
    });
    return { success: true, data: null };
  });
}

export async function getRecentScoreTransactions(limit = 10) {
  return withAuth(async () => {
    const transactions = await getRecentTransactions(limit);
    return { success: true, data: transactions };
  });
}

export async function getScoreDistributions() {
  return withAuth(async () => {
    const supabase = await createClient();
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single();

    const distribution = await getScoreDistribution(acYear?.id);
    return { success: true, data: distribution };
  });
}
