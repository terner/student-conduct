import { createClient } from '@/lib/supabase/server';

export interface DashboardStats {
  total_students: number;
  active_students: number;
  total_classrooms: number;
  total_teachers: number;
  average_score: number;
  at_risk_count: number;
  score_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export interface DashboardData {
  stats: DashboardStats;
  recent_transactions: any[];
  at_risk_students: any[];
}

/**
 * Get all dashboard data in one shot — single auth check, minimal queries.
 *
 * Performance optimizations applied:
 *  - All score_transactions fetched in ONE bulk query (no N+1 per student)
 *  - Aggregation done in-memory (fast for school-scale data, avoids looped DB calls)
 *  - Academic year & settings fetched once, not repeated per metric
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  // ── Parallel: independent metadata queries ──────────────────────
  const [
    acYearResult,
    studentCountResult,
    classroomCountResult,
    teacherCountResult,
    settingsResult,
    studentsResult,
  ] = await Promise.all([
    supabase
      .from('academic_years')
      .select('id, base_score, name')
      .eq('is_current', true)
      .single(),
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('current_status', 'active'),
    supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'thresholds')
      .single(),
    supabase
      .from('students')
      .select(`
        id,
        student_id_number,
        profiles!inner(full_name),
        classrooms!inner(name, grade_level)
      `)
      .eq('current_status', 'active'),
  ]);

  const acYear = acYearResult.data;
  const acYearId = acYear?.id;
  const baseScore = acYear?.base_score || 100;
  const totalStudentCount = studentCountResult.count || 0;
  const thresholds: Array<{ deducted: number; action: string; color: string }> =
    (settingsResult.data?.value as any[]) || [];
  const firstThreshold = thresholds.length > 0 ? thresholds[0].deducted : 20;

  // ── Bulk-fetch ALL approved score_transactions for active students ──
  const studentIds = (studentsResult.data || []).map((s: any) => s.id);

  let allTransactions: any[] = [];
  if (studentIds.length > 0) {
    // Fetch in chunks of 1000 to avoid URL length limits in Supabase REST
    const chunkSize = 1000;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const chunk = studentIds.slice(i, i + chunkSize);
      let txQuery = supabase
        .from('score_transactions')
        .select('student_id, points, status')
        .in('student_id', chunk)
        .eq('status', 'approved');
      if (acYearId) {
        txQuery = txQuery.eq('academic_year_id', acYearId);
      }
      const { data } = await txQuery;
      if (data) allTransactions.push(...data);
    }
  }

  // Build a lookup: student_id -> { deducted, added }
  const scoreMap = new Map<string, { deducted: number; added: number }>();
  for (const tx of allTransactions) {
    if (!scoreMap.has(tx.student_id)) {
      scoreMap.set(tx.student_id, { deducted: 0, added: 0 });
    }
    const entry = scoreMap.get(tx.student_id)!;
    if (tx.points < 0) {
      entry.deducted += Math.abs(tx.points);
    } else {
      entry.added += tx.points;
    }
  }

  // ── Compute stats ────────────────────────────────────────────
  let totalScoreSum = 0;
  let atRiskCount = 0;
  let excellentCount = 0;
  let goodCount = 0;
  let fairCount = 0;
  let poorCount = 0;

  const atRiskStudents: any[] = [];

  for (const student of studentsResult.data || []) {
    const scores = scoreMap.get(student.id) || { deducted: 0, added: 0 };
    const currentScore = baseScore - scores.deducted + scores.added;

    totalScoreSum += currentScore;

    // Distribution
    if (currentScore >= baseScore) excellentCount++;
    else if (currentScore >= baseScore - 20) goodCount++;
    else if (currentScore >= baseScore - 40) fairCount++;
    else poorCount++;

    // At-risk check
    if (scores.deducted >= firstThreshold) {
      atRiskCount++;
      // Find which threshold level
      let thresholdIdx = -1;
      let thresholdAction = '';
      let thresholdColor = '';
      for (let ti = thresholds.length - 1; ti >= 0; ti--) {
        if (scores.deducted >= thresholds[ti].deducted) {
          thresholdIdx = ti;
          thresholdAction = thresholds[ti].action;
          thresholdColor = thresholds[ti].color;
          break;
        }
      }
      atRiskStudents.push({
        student_id: student.id,
        first_name: ((student.profiles as any)?.full_name || '').split(' ')[0] || '',
        last_name: ((student.profiles as any)?.full_name || '').split(' ').slice(1).join(' ') || '',
        student_id_number: student.student_id_number,
        classroom_name: (student.classrooms as any)?.name || '',
        current_score: currentScore,
        deducted_total: scores.deducted,
        threshold_level: thresholdIdx + 1,
        threshold_index: thresholdIdx,
        threshold_action: thresholdAction,
        threshold_color: thresholdColor,
        deduct_count: 0,
        add_count: 0,
      });
    }
  }

  // Sort at-risk: most critical first
  atRiskStudents.sort((a: any, b: any) => {
    if (b.threshold_index !== a.threshold_index) return b.threshold_index - a.threshold_index;
    return b.deducted_total - a.deducted_total;
  });

  const studentCount = studentsResult.data?.length || 0;

  // ── Recent transactions ─────────────────────────────────────
  const { data: recentData } = await supabase
    .from('score_transactions')
    .select(`
      *,
      students!inner(student_id_number),
      score_categories!inner(name, type),
      profiles!score_transactions_recorded_by_fkey(full_name)
    `)
    .eq('status', 'approved')
    .order('recorded_at', { ascending: false })
    .limit(10);

  const recentTransactions = (recentData || []).map((t: any) => ({
    id: t.id,
    student_id: t.student_id,
    category_name: t.score_categories?.name || '',
    points: t.points,
    note: t.note,
    recorded_at: t.recorded_at,
    recorded_by_name: t.profiles?.full_name || '',
    student_id_number: t.students?.student_id_number || '',
  }));

  return {
    stats: {
      total_students: totalStudentCount,
      active_students: studentCount,
      total_classrooms: classroomCountResult.count || 0,
      total_teachers: teacherCountResult.count || 0,
      average_score: studentCount > 0 ? Math.round(totalScoreSum / studentCount) : baseScore,
      at_risk_count: atRiskCount,
      score_distribution: {
        excellent: excellentCount,
        good: goodCount,
        fair: fairCount,
        poor: poorCount,
      },
    },
    recent_transactions: recentTransactions,
    at_risk_students: atRiskStudents,
  };
}
