import { createClient } from '@/lib/supabase/server';
import type { ScoreTransaction, ScoreCategory } from '@/types';

function formatProfileFullName(profile: Record<string, unknown> | null | undefined) {
  const prefix = ((profile?.prefix as string) || '').trim();
  const fullName = ((profile?.full_name as string) || '').trim();
  if (!prefix) return fullName;
  return fullName.startsWith(prefix) ? fullName : `${prefix}${fullName}`;
}

export interface ScoreTransactionWithDetails extends ScoreTransaction {
  student_name?: string;
  student_id_number?: string;
  category_name?: string;
  category_type?: 'deduct' | 'add';
  recorded_by_name?: string;
  approved_by_name?: string;
  voided_by_name?: string;
  classroom_name?: string;
  classroom_grade?: number;
  evidence?: {
    id: string;
    file_name: string;
    file_type: string;
    file_size?: number;
    file_path?: string;
    file_url?: string;
    storage_provider?: string;
  }[];
  category_name_at_record?: string;
  category_type_at_record?: 'deduct' | 'add';
  requires_evidence_at_record?: boolean | null;
  requires_approval_at_record?: boolean | null;
}

export interface ScoreListParams {
  page?: number;
  page_size?: number;
  student_id?: string;
  classroom_id?: string;
  category_id?: string;
  status?: string;
  academic_year_id?: string;
  recorded_by?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
}

export interface ScoreSummary {
  total_deducted: number;
  total_added: number;
  current_score: number;
  deduct_count: number;
  add_count: number;
}

/**
 * List score transactions with filters and pagination
 */
export async function listScoreTransactions(params: ScoreListParams = {}) {
  const supabase = await createClient();
  const {
    page = 1,
    page_size = 50,
    student_id,
    classroom_id,
    category_id,
    status,
    academic_year_id,
    recorded_by,
    from_date,
    to_date,
    search,
  } = params;

  let query = supabase
    .from('score_transactions')
    .select(`
      *,
      students!inner(
        student_id_number,
        profiles!students_profile_id_fkey(full_name, prefix),
        classrooms!inner(name, grade_level)
      ),
      score_categories!inner(name, type),
      profiles!score_transactions_recorded_by_fkey(full_name),
      approved_by_profile:profiles!score_transactions_approved_by_fkey(full_name),
      voided_by_profile:profiles!score_transactions_voided_by_fkey(full_name),
      score_transaction_evidence(id, file_name, file_type, file_size, file_path, file_url, storage_provider)
    `);

  let countQuery = supabase
    .from('score_transactions')
    .select(`
      id,
      students!inner(
        student_id_number,
        classrooms!inner(name, grade_level)
      )
    `, { count: 'exact', head: true });

  if (student_id) query = query.eq('student_id', student_id);
  if (student_id) countQuery = countQuery.eq('student_id', student_id);
  if (category_id) query = query.eq('category_id', category_id);
  if (category_id) countQuery = countQuery.eq('category_id', category_id);
  if (status) query = query.eq('status', status);
  if (status) countQuery = countQuery.eq('status', status);
  if (academic_year_id) query = query.eq('academic_year_id', academic_year_id);
  if (academic_year_id) countQuery = countQuery.eq('academic_year_id', academic_year_id);
  if (recorded_by) query = query.eq('recorded_by', recorded_by);
  if (recorded_by) countQuery = countQuery.eq('recorded_by', recorded_by);
  if (from_date) query = query.gte('recorded_at', from_date);
  if (from_date) countQuery = countQuery.gte('recorded_at', from_date);
  if (to_date) query = query.lte('recorded_at', to_date);
  if (to_date) countQuery = countQuery.lte('recorded_at', to_date);

  // If classroom_id filter, join through students table
  if (classroom_id) {
    query = query.eq('students.classroom_id', classroom_id);
    countQuery = countQuery.eq('students.classroom_id', classroom_id);
  }

  if (search) {
    query = query.or(`students.student_id_number.ilike.%${search}%`);
    countQuery = countQuery.or(`students.student_id_number.ilike.%${search}%`);
  }

  const from = (page - 1) * page_size;
  const to = from + page_size - 1;

  const [
    { data, error },
    { count, error: countError },
  ] = await Promise.all([
    query.order('recorded_at', { ascending: false }).range(from, to),
    countQuery,
  ]);

  if (error) throw error;
  if (countError) throw countError;

  const mapped: ScoreTransactionWithDetails[] = (data || []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    student_id: t.student_id as string,
    category_id: t.category_id as string,
    points: t.points as number,
    note: t.note as string | undefined,
    recorded_by: t.recorded_by as string,
    recorded_at: t.recorded_at as string,
    academic_year: t.academic_year_id as string || '',
    status: t.status as ScoreTransaction['status'],
    approved_by: t.approved_by as string | undefined,
    approved_at: t.approved_at as string | undefined,
    voided_by: t.voided_by as string | undefined,
    voided_at: t.voided_at as string | undefined,
    void_reason: t.void_reason as string | undefined,
    category_name_at_record: t.category_name_at_record as string | undefined,
    category_type_at_record: t.category_type_at_record as 'deduct' | 'add' | undefined,
    requires_evidence_at_record: t.requires_evidence_at_record as boolean | null | undefined,
    requires_approval_at_record: t.requires_approval_at_record as boolean | null | undefined,
    student_id_number: (t.students as Record<string, unknown>)?.student_id_number as string || '',
    student_name: formatProfileFullName((t.students as Record<string, unknown>)?.profiles as Record<string, unknown>),
    classroom_name: ((t.students as Record<string, unknown>)?.classrooms as Record<string, unknown>)?.name as string || '',
    classroom_grade: ((t.students as Record<string, unknown>)?.classrooms as Record<string, unknown>)?.grade_level as number || 0,
    category_name: (t.category_name_at_record as string) || (t.score_categories as Record<string, unknown>)?.name as string || '',
    category_type: (t.category_type_at_record as 'deduct' | 'add') || (t.score_categories as Record<string, unknown>)?.type as 'deduct' | 'add' || 'deduct',
    recorded_by_name: (t.profiles as Record<string, unknown>)?.full_name as string || '',
    approved_by_name: (t.approved_by_profile as Record<string, unknown>)?.full_name as string || '',
    voided_by_name: (t.voided_by_profile as Record<string, unknown>)?.full_name as string || '',
    evidence: ((t.score_transaction_evidence as Array<Record<string, unknown>>) || []).map((e) => ({
      id: e.id as string,
      file_name: e.file_name as string,
      file_type: e.file_type as string,
      file_size: e.file_size as number | undefined,
      file_path: e.file_path as string | undefined,
      file_url: e.file_url as string | undefined,
      storage_provider: e.storage_provider as string | undefined,
    })),
  }));

  return {
    data: mapped,
    total: count || 0,
    page,
    page_size,
    total_pages: Math.ceil((count || 0) / page_size),
  };
}

/**
 * Get score summary for a student
 */
export async function getScoreSummary(studentId: string, academicYearId?: string): Promise<ScoreSummary> {
  const supabase = await createClient();

  let query = supabase
    .from('score_transactions')
    .select('points, status')
    .eq('student_id', studentId)
    .eq('status', 'approved');

  if (academicYearId) {
    query = query.eq('academic_year_id', academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const transactions = data || [];
  const totalDeducted = transactions
    .filter(t => t.points < 0)
    .reduce((sum, t) => sum + Math.abs(t.points), 0);
  const totalAdded = transactions
    .filter(t => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);

  return {
    total_deducted: totalDeducted,
    total_added: totalAdded,
    current_score: 100 - totalDeducted + totalAdded,
    deduct_count: transactions.filter(t => t.points < 0).length,
    add_count: transactions.filter(t => t.points > 0).length,
  };
}

/**
 * Get recent transactions (for dashboard)
 */
export async function getRecentTransactions(limit = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('score_transactions')
    .select(`
      *,
      students(student_id_number, classroom_id, classrooms(name)),
      score_categories(name, type),
      profiles!score_transactions_recorded_by_fkey(full_name)
    `)
    .eq('status', 'approved')
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    student_id: t.student_id as string,
    category_name: (t.category_name_at_record as string) || (t.score_categories as Record<string, unknown>)?.name as string || '',
    points: t.points as number,
    note: t.note as string | undefined,
    recorded_at: t.recorded_at as string,
    recorded_by_name: (t.profiles as Record<string, unknown>)?.full_name as string || '',
    student_id_number: (t.students as Record<string, unknown>)?.student_id_number as string || '',
    classroom_name: ((t.students as Record<string, unknown>)?.classrooms as Record<string, unknown>)?.name as string || '',
  }));
}

/**
 * Get score categories
 */
export async function getScoreCategories(includeInactive = false) {
  const supabase = await createClient();

  let query = supabase
    .from('score_categories')
    .select('*')
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ScoreCategory[];
}

/**
 * Create score transaction
 */
export async function createScoreTransaction(data: {
  student_id: string;
  category_id: string;
  points: number;
  note?: string;
  recorded_by: string;
  academic_year_id: string;
  requires_approval?: boolean;
  requires_evidence?: boolean;
  category_name?: string;
  category_type?: 'deduct' | 'add';
}) {
  const supabase = await createClient();

  const { data: transaction, error } = await supabase
    .from('score_transactions')
    .insert({
      student_id: data.student_id,
      category_id: data.category_id,
      points: data.points,
      note: data.note || null,
      recorded_by: data.recorded_by,
      academic_year_id: data.academic_year_id,
      status: data.requires_approval ? 'pending' : 'approved',
      approved_by: data.requires_approval ? null : data.recorded_by,
      approved_at: data.requires_approval ? null : new Date().toISOString(),
      category_name_at_record: data.category_name || null,
      category_type_at_record: data.category_type || null,
      requires_evidence_at_record: data.requires_evidence ?? false,
      requires_approval_at_record: data.requires_approval ?? false,
    })
    .select('id')
    .single();

  if (error) throw error;
  return transaction;
}

/**
 * Void/reverse a score transaction
 */
export async function voidScoreTransaction(
  transactionId: string,
  voidedBy: string,
  voidReason: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('score_transactions')
    .update({
      status: 'voided',
      voided_by: voidedBy,
      voided_at: new Date().toISOString(),
      void_reason: voidReason,
    })
    .eq('id', transactionId)
    .in('status', ['pending', 'approved']);

  if (error) throw error;
  return { success: true };
}

/**
 * Approve a pending score transaction
 */
export async function approveScoreTransaction(transactionId: string, approvedBy: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('score_transactions')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', transactionId)
    .eq('status', 'pending');

  if (error) throw error;
  return { success: true };
}

/**
 * Create or update score category
 */
export async function upsertScoreCategory(data: Partial<ScoreCategory> & { name: string; type: 'deduct' | 'add'; default_points: number }) {
  const supabase = await createClient();

  if (data.id) {
    const { error } = await supabase
      .from('score_categories')
      .update({
        name: data.name,
        type: data.type,
        default_points: data.default_points,
        description: data.description || null,
        requires_evidence: data.requires_evidence || false,
        requires_approval: data.requires_approval || false,
        is_active: data.is_active ?? true,
      })
      .eq('id', data.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('score_categories')
      .insert({
        name: data.name,
        type: data.type,
        default_points: data.default_points,
        description: data.description || null,
        requires_evidence: data.requires_evidence || false,
        requires_approval: data.requires_approval || false,
      });

    if (error) throw error;
  }

  return { success: true };
}

/**
 * Deactivate a score category without breaking historical transactions.
 */
export async function deactivateScoreCategory(categoryId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('score_categories')
    .update({ is_active: false })
    .eq('id', categoryId);

  if (error) throw error;
  return { success: true };
}

/**
 * Get score distribution across thresholds
 */
export async function getScoreDistribution(academicYearId?: string) {
  const supabase = await createClient();

  // Get all active students with their current score
  let query = supabase
    .from('students')
    .select(`
      id,
      student_id_number,
      profiles(full_name, prefix),
      classrooms(name, grade_level),
      score_transactions!inner(points, status, academic_year_id)
    `)
    .eq('current_status', 'active');

  if (academicYearId) {
    query = query.eq('score_transactions.academic_year_id', academicYearId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Calculate distribution
  const distribution = {
    excellent: 0, // score > 100
    good: 0,      // score 80-100
    fair: 0,      // score 60-79
    poor: 0,      // score < 60
  };

  // Get thresholds from settings
  const { data: settingsData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'thresholds')
    .single();

  const thresholds: Array<{ deducted: number }> = settingsData?.value as Array<{ deducted: number }> || [];
  const atRiskCount = thresholds.length > 0 ? thresholds[0].deducted : 20;

  let atRiskCountResult = 0;

  for (const student of (data || [])) {
    const transactions = (student.score_transactions as Array<{ points: number; status: string }> || [])
      .filter(t => t.status === 'approved');

    const totalDeducted = transactions
      .filter(t => t.points < 0)
      .reduce((sum, t) => sum + Math.abs(t.points), 0);
    const totalAdded = transactions
      .filter(t => t.points > 0)
      .reduce((sum, t) => sum + t.points, 0);

    const score = 100 - totalDeducted + totalAdded;

    if (score >= 100) distribution.excellent++;
    else if (score >= 80) distribution.good++;
    else if (score >= 60) distribution.fair++;
    else distribution.poor++;

    if (totalDeducted >= atRiskCount) atRiskCountResult++;
  }

  return {
    distribution,
    at_risk_count: atRiskCountResult,
    total_students: (data || []).length,
  };
}
