'use server';

import { withAuth, type ActionResult } from '@/lib/server-action';
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

export async function getScores(params: {
  page?: number;
  page_size?: number;
  student_id?: string;
  classroom_id?: string;
  category_id?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}) {
  return withAuth(async () => {
    const result = await listScoreTransactions(params);
    return { success: true, data: result };
  });
}

export async function recordScore(data: {
  student_id: string;
  category_id: string;
  points: number;
  note?: string;
}) {
  return withAuth(async (profile) => {
    const validated = scoreRecordSchema.parse(data);

    const xssCheck = validateXSS({ note: validated.note || '' });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    const supabase = await createClient();

    // Get academic year
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single();

    // Check if category requires approval
    const { data: category } = await supabase
      .from('score_categories')
      .select('requires_approval')
      .eq('id', validated.category_id)
      .single();

    const result = await createScoreTransaction({
      student_id: validated.student_id,
      category_id: validated.category_id,
      points: validated.points,
      note: validated.note || undefined,
      recorded_by: profile.id,
      academic_year_id: acYear?.id || '',
      requires_approval: category?.requires_approval || false,
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
    const supabase = await createClient();

    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single();

    const { data: category } = await supabase
      .from('score_categories')
      .select('requires_approval')
      .eq('id', data.category_id)
      .single();

    const results = [];
    for (const studentId of data.student_ids) {
      const result = await createScoreTransaction({
        student_id: studentId,
        category_id: data.category_id,
        points: data.points,
        note: data.note || undefined,
        recorded_by: profile.id,
        academic_year_id: acYear?.id || '',
        requires_approval: category?.requires_approval || false,
      });
      results.push(result);
    }

    return { success: true, data: { count: results.length } };
  });
}

export async function voidScore(transactionId: string, voidReason: string) {
  return withAuth(async (profile) => {
    const validated = scoreVoidSchema.parse({ transaction_id: transactionId, void_reason: voidReason });

    await voidScoreTransaction(validated.transaction_id, profile.id, validated.void_reason);
    return { success: true, data: { transaction_id: transactionId } };
  });
}

export async function approveScore(transactionId: string) {
  return withAuth(async (profile) => {
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
    const categories = await getScoreCategories();
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
  return withAuth(async () => {
    const validated = scoreCategorySchema.parse(data);
    const xssCheck = validateXSS({ name: validated.name, description: validated.description || '' });
    if (xssCheck) {
      return { success: false, error: { code: 'XSS_DETECTED', message: 'ตรวจพบ XSS ในข้อมูล' } };
    }

    await upsertScoreCategory(validated);
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
