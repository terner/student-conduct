import { createClient } from '@/lib/supabase/server';

function formatProfileFullName(profile: Record<string, unknown> | null | undefined) {
  const prefix = ((profile?.prefix as string) || '').trim();
  const fullName = ((profile?.full_name as string) || '').trim();
  if (!prefix) return fullName;
  return fullName.startsWith(prefix) ? fullName : `${prefix}${fullName}`;
}

function firstJoinedRow<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

export interface DashboardStats {
  academic_year_name: string;
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
  academic_years: Array<{ id: string; name: string; is_current: boolean }>;
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
export async function getDashboardData(params: { academic_year_id?: string } = {}): Promise<DashboardData> {
  const supabase = await createClient();

  // ── Parallel: independent metadata queries ──────────────────────
  const [
    academicYearsResult,
    classroomCountResult,
    teacherCountResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from('academic_years')
      .select('id, base_score, name, is_current')
      .order('name', { ascending: false }),
    supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true })
      .eq('academic_year_id', params.academic_year_id || ''),
    supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'thresholds')
      .single(),
  ]);

  const academicYears = academicYearsResult.data || [];
  const acYear = academicYears.find((year: any) => year.id === params.academic_year_id)
    || academicYears.find((year: any) => year.is_current)
    || academicYears[0];
  const acYearId = acYear?.id;
  const baseScore = acYear?.base_score || 100;
  const thresholds: Array<{ deducted: number; action: string; color: string }> =
    (settingsResult.data?.value as any[]) || [];
  const firstThreshold = thresholds.length > 0 ? thresholds[0].deducted : 20;

  let selectedClassroomCount = classroomCountResult.count || 0;
  if (!params.academic_year_id && acYearId) {
    const { count } = await supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true })
      .eq('academic_year_id', acYearId);
    selectedClassroomCount = count || 0;
  }

  const { data: enrollmentData } = acYearId
    ? await supabase
      .from('student_enrollments')
      .select(`
        students!inner(
          id,
          student_id_number,
          profiles!inner(full_name, prefix)
        ),
        classrooms!inner(name, grade_level)
      `)
      .eq('academic_year_id', acYearId)
      .in('enrollment_status', ['active', 'promoted', 'repeated', 'transferred', 'graduated'])
    : { data: [] };

  const students = (enrollmentData || []).map((enrollment: any) => ({
    id: enrollment.students?.id,
    student_id_number: enrollment.students?.student_id_number,
    profiles: enrollment.students?.profiles,
    classrooms: enrollment.classrooms,
  })).filter((student: any) => Boolean(student.id));

  // ── Bulk-fetch ALL approved score_transactions for active students ──
  const studentIds = students.map((s: any) => s.id);

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

  for (const student of students) {
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
      const profile = firstJoinedRow(student.profiles) as Record<string, unknown> | null;
      const fullName = formatProfileFullName(profile);
      atRiskStudents.push({
        student_id: student.id,
        first_name: fullName.split(' ')[0] || '',
        last_name: fullName.split(' ').slice(1).join(' ') || '',
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

  const studentCount = students.length;

  // ── Recent transactions ─────────────────────────────────────
  let recentQuery = supabase
    .from('score_transactions')
    .select(`
      *,
      students!inner(student_id_number, profiles!inner(full_name, prefix)),
      score_categories!inner(name, type),
      profiles!score_transactions_recorded_by_fkey(full_name)
    `)
    .eq('status', 'approved')
    .order('recorded_at', { ascending: false })
    .limit(10);
  if (acYearId) recentQuery = recentQuery.eq('academic_year_id', acYearId);
  const { data: recentData } = await recentQuery;

  const recentTransactions = (recentData || []).map((t: any) => ({
    id: t.id,
    student_id: t.student_id,
    student_name: formatProfileFullName(firstJoinedRow(t.students?.profiles) as Record<string, unknown> | null),
    category_name: t.category_name_at_record || t.score_categories?.name || '',
    points: t.points,
    note: t.note,
    recorded_at: t.recorded_at,
    recorded_by_name: t.profiles?.full_name || '',
    student_id_number: t.students?.student_id_number || '',
  }));

  return {
    stats: {
      academic_year_name: acYear?.name || '',
      total_students: studentCount,
      active_students: studentCount,
      total_classrooms: selectedClassroomCount,
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
    academic_years: academicYears.map((year: any) => ({
      id: year.id,
      name: year.name,
      is_current: Boolean(year.is_current),
    })),
    recent_transactions: recentTransactions,
    at_risk_students: atRiskStudents,
  };
}
