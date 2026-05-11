import { createAdminClient } from '@/lib/supabase/server';

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
  recent_transactions: Record<string, unknown>[];
  at_risk_students: Record<string, unknown>[];
}

interface AcademicYearRow {
  id: string;
  name: string;
  is_current: boolean;
  base_score?: number | null;
}

interface DashboardStudent {
  id: string;
  student_id_number: string;
  profiles: Record<string, unknown> | Record<string, unknown>[] | null;
  classrooms: Record<string, unknown> | null;
}

interface ScorePointRow {
  student_id: string;
  points: number;
}

async function fetchAll<T>(
  queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
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
  const supabase = await createAdminClient();

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

  const academicYears = (academicYearsResult.data || []) as AcademicYearRow[];
  const acYear = academicYears.find((year) => year.id === params.academic_year_id)
    || academicYears.find((year) => year.is_current)
    || academicYears[0];
  const acYearId = acYear?.id;
  const baseScore = acYear?.base_score || 100;
  const thresholds: Array<{ deducted: number; action: string; color: string }> =
    Array.isArray(settingsResult.data?.value)
      ? settingsResult.data.value as Array<{ deducted: number; action: string; color: string }>
      : [];
  const firstThreshold = thresholds.length > 0 ? thresholds[0].deducted : 20;

  let selectedClassroomCount = classroomCountResult.count || 0;
  if (!params.academic_year_id && acYearId) {
    const { count } = await supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true })
      .eq('academic_year_id', acYearId);
    selectedClassroomCount = count || 0;
  }

  const enrollmentData = acYearId
    ? await fetchAll<Record<string, unknown>>((from, to) => supabase
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
      .range(from, to))
    : [];

  const students: DashboardStudent[] = (enrollmentData || [])
    .map((enrollment: Record<string, unknown>) => {
      const student = enrollment.students as Record<string, unknown> | null;
      return {
        id: (student?.id as string) || '',
        student_id_number: (student?.student_id_number as string) || '',
        profiles: (student?.profiles as Record<string, unknown> | Record<string, unknown>[] | null) || null,
        classrooms: (enrollment.classrooms as Record<string, unknown> | null) || null,
      };
    })
    .filter((student) => Boolean(student.id));

  // ── Bulk-fetch ALL approved score_transactions for active students ──
  const studentIds = students.map((student) => student.id);

  const allTransactions: ScorePointRow[] = [];
  if (studentIds.length > 0) {
    // Keep chunks small to avoid URL length limits in Supabase REST.
    const chunkSize = 100;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const chunk = studentIds.slice(i, i + chunkSize);
      const rows = await fetchAll<ScorePointRow>((from, to) => {
        let txQuery = supabase
          .from('score_transactions')
          .select('student_id, points, status')
          .in('student_id', chunk)
          .eq('status', 'approved')
          .range(from, to);
        if (acYearId) {
          txQuery = txQuery.eq('academic_year_id', acYearId);
        }
        return txQuery;
      });
      allTransactions.push(...rows);
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

  const atRiskStudents: Record<string, unknown>[] = [];

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
        classroom_name: (student.classrooms?.name as string) || '',
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
  atRiskStudents.sort((a, b) => {
    const aThreshold = Number(a.threshold_index || 0);
    const bThreshold = Number(b.threshold_index || 0);
    if (bThreshold !== aThreshold) return bThreshold - aThreshold;
    return Number(b.deducted_total || 0) - Number(a.deducted_total || 0);
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
    .order('created_at', { ascending: false })
    .order('recorded_at', { ascending: false })
    .limit(10);
  if (acYearId) recentQuery = recentQuery.eq('academic_year_id', acYearId);
  const { data: recentData } = await recentQuery;

  const recentTransactions = (recentData || []).map((transaction: Record<string, unknown>) => {
    const student = transaction.students as Record<string, unknown> | null;
    const category = transaction.score_categories as Record<string, unknown> | null;
    const recorder = transaction.profiles as Record<string, unknown> | null;
    return {
      id: transaction.id,
      student_id: transaction.student_id,
      student_name: formatProfileFullName(firstJoinedRow(student?.profiles as Record<string, unknown> | Record<string, unknown>[] | null)),
      category_name: transaction.category_name_at_record || category?.name || '',
      points: transaction.points,
      note: transaction.note,
      recorded_at: transaction.recorded_at,
      created_at: transaction.created_at,
      recorded_by_name: recorder?.full_name || '',
      student_id_number: student?.student_id_number || '',
    };
  });

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
    academic_years: academicYears.map((year) => ({
      id: year.id,
      name: year.name,
      is_current: Boolean(year.is_current),
    })),
    recent_transactions: recentTransactions,
    at_risk_students: atRiskStudents,
  };
}
