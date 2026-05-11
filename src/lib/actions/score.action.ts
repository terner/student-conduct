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
  getRecentTransactions,
  getScoreDistribution,
} from '@/lib/db';
import { scoreRecordSchema, scoreCategorySchema, scoreVoidSchema } from '@/lib/validation/schemas';
import { validateXSS } from '@/lib/security/validate-input';
import { createClient } from '@/lib/supabase/server';
import { canApproveScores, canRecordScores } from '@/lib/security/roles';
import { clearTtlCacheByPrefix, getTtlCache, setTtlCache } from '@/lib/cache/ttl-cache';

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

function getAcademicYearClosedReason(year: {
  start_date?: string | null;
  end_date?: string | null;
}, today = todayInBangkok()) {
  if (year.start_date && today < year.start_date) {
    return `ยังไม่ถึงช่วงปีการศึกษา เริ่มวันที่ ${year.start_date}`;
  }
  if (year.end_date && today > year.end_date) {
    return `พ้นช่วงปีการศึกษาแล้ว สิ้นสุดวันที่ ${year.end_date}`;
  }
  return '';
}

async function resolveAcademicYearForScoring(
  supabase: Awaited<ReturnType<typeof createClient>>,
  academicYearId?: string,
) {
  let query = supabase
    .from('academic_years')
    .select('id, name, start_date, end_date, is_current');

  query = academicYearId ? query.eq('id', academicYearId) : query.eq('is_current', true);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureAcademicYearOpenForScoring(
  supabase: Awaited<ReturnType<typeof createClient>>,
  academicYearId?: string,
) {
  const academicYear = await resolveAcademicYearForScoring(supabase, academicYearId);
  if (!academicYear?.id) {
    return {
      success: false as const,
      error: { code: 'NO_CURRENT_YEAR', message: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' },
    };
  }

  if (!academicYear.is_current) {
    return {
      success: false as const,
      error: { code: 'ACADEMIC_YEAR_NOT_CURRENT', message: 'บันทึกคะแนนได้เฉพาะปีการศึกษาปัจจุบัน' },
      academicYear,
    };
  }

  const closedReason = getAcademicYearClosedReason(academicYear);
  if (closedReason) {
    return {
      success: false as const,
      error: { code: 'ACADEMIC_YEAR_CLOSED', message: `ไม่สามารถบันทึกคะแนนย้อนหลังได้ (${closedReason})` },
      academicYear,
    };
  }

  return { success: true as const, academicYear };
}

export async function getScoreRecordingAvailability(academicYearId?: string) {
  return withAuth(async (profile) => {
    if (!canRecordScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์บันทึกคะแนน' } };
    }

    const supabase = await createClient();
    const academicYear = await resolveAcademicYearForScoring(supabase, academicYearId);
    if (!academicYear?.id) {
      return { success: false, error: { code: 'NO_CURRENT_YEAR', message: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' } };
    }

    const closedReason = getAcademicYearClosedReason(academicYear);
    const notCurrentReason = academicYear.is_current ? '' : 'บันทึกคะแนนได้เฉพาะปีการศึกษาปัจจุบัน';
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดูประวัติคะแนน' } };
    }

    const result = await listScoreTransactions(params);
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์บันทึกคะแนน' } };
    }

    const validated = scoreRecordSchema.parse(data);

    const xssCheck = validateXSS({ note: validated.note || '' });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    const supabase = await createClient();

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
        return { success: false, error: { code: 'INVALID_ACADEMIC_YEAR', message: 'นักเรียนนี้ไม่อยู่ในปีการศึกษาที่เลือก' } };
      }
    }

    // Check if category requires approval
    const { data: category } = await supabase
      .from('score_categories')
      .select('name, type, requires_approval, requires_evidence')
      .eq('id', validated.category_id)
      .single();

    if (category?.requires_evidence && !data.has_evidence) {
      return { success: false, error: { code: 'EVIDENCE_REQUIRED', message: 'รายการนี้ต้องแนบหลักฐานก่อนบันทึก' } };
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์บันทึกคะแนน' } };
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
      return { success: false, error: { code: 'EVIDENCE_REQUIRED', message: 'รายการนี้ต้องแนบหลักฐาน จึงไม่รองรับการบันทึกแบบกลุ่ม' } };
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
    }

    return { success: true, data: { count: results.length } };
  });
}

export async function voidScore(transactionId: string, voidReason: string) {
  return withAuth(async (profile) => {
    if (!canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ยกเลิกรายการคะแนน' } };
    }

    const validated = scoreVoidSchema.parse({ transaction_id: transactionId, void_reason: voidReason });

    await voidScoreTransaction(validated.transaction_id, profile.id, validated.void_reason);
    return { success: true, data: { transaction_id: transactionId } };
  });
}

export async function approveScore(transactionId: string) {
  return withAuth(async (profile) => {
    if (!canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์อนุมัติคะแนน' } };
    }

    const supabase = await createClient();
    const { data: transaction } = await supabase
      .from('score_transactions')
      .select('requires_evidence_at_record')
      .eq('id', transactionId)
      .maybeSingle();

    if (transaction?.requires_evidence_at_record === true) {
      const { count } = await supabase
        .from('score_transaction_evidence')
        .select('id', { count: 'exact', head: true })
        .eq('transaction_id', transactionId);

      if (!count) {
        return { success: false, error: { code: 'EVIDENCE_REQUIRED', message: 'รายการนี้ต้องมีหลักฐานก่อนอนุมัติ' } };
      }
    }

    await approveScoreTransaction(transactionId, profile.id);
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
    const cached = getTtlCache<Awaited<ReturnType<typeof getScoreCategories>>>('score-categories:active');
    if (cached) return { success: true, data: cached };

    const categories = await getScoreCategories();
    setTtlCache('score-categories:active', categories, MASTER_DATA_TTL_MS);
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
      return { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้ดูแลระบบ' } };
    }

    const validated = scoreCategorySchema.parse(data);
    const xssCheck = validateXSS({ name: validated.name, description: validated.description || '' });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    await upsertScoreCategory(validated);
    clearTtlCacheByPrefix('score-categories:');
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
