'use server';

import { withAuth } from '@/lib/server-action';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { canApproveScores, hasRole } from '@/lib/security/roles';
import { listStudents, getScoreSummary } from '@/lib/db';
import type { StudentThresholdInfo } from '@/types';
import { logAction } from '@/lib/audit/log';

export type RankingSortBy = 'current_score' | 'deducted' | 'transaction_count' | 'latest' | 'name';

export interface StudentRankingReportParams {
  academic_year_id?: string;
  grade_level_id?: string;
  grade_level?: number;
  classroom_name?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: RankingSortBy;
  rank_mode?: 'risk' | 'score';
}

export interface StudentRankingRow {
  id: string;
  student_id_number: string;
  full_name: string;
  classroom_name: string;
  grade_level_id: string;
  grade_level_name: string;
  grade_level: number;
  current_score: number;
  total_deducted: number;
  total_added: number;
  transaction_count: number;
  deduct_count: number;
  add_count: number;
  latest_recorded_at?: string;
  rank_overall: number;
  rank_classroom: number;
  rank_grade: number;
  recent_transactions: Array<{
    id: string;
    category_name: string;
    category_type: string;
    points: number;
    note?: string;
    recorded_at: string;
    recorded_by_name: string;
  }>;
}

export interface SchoolStatisticsReportData {
  academic_years: Array<{ id: string; name: string; is_current: boolean }>;
  academic_year: string;
  academic_year_id: string;
  base_score: number;
  summary: {
    total_students: number;
    average_score: number;
    min_score: number;
    max_score: number;
    total_deducted: number;
    total_added: number;
    transaction_count: number;
    at_risk_count: number;
  };
  score_distribution: Array<{ name: string; count: number }>;
  category_breakdown: Array<{ name: string; type: string; total_points: number; count: number }>;
  classroom_breakdown: Array<{ name: string; total_students: number; average_score: number; total_deducted: number; transaction_count: number }>;
  grade_breakdown: Array<{ name: string; total_students: number; average_score: number; total_deducted: number; transaction_count: number }>;
  monthly_trend: Array<{ month: string; deducted: number; added: number; transaction_count: number }>;
  top_risk_students: Array<{ id: string; student_id_number: string; full_name: string; classroom_name: string; current_score: number; total_deducted: number }>;
}

interface ClassroomReportStudent {
  id: string;
  full_name: string;
  student_id_number: string;
  total_deducted: number;
  total_added: number;
  current_score: number;
  deduct_count: number;
  add_count: number;
  rank: number;
}

interface ClassroomReportData {
  classroom: {
    id: string;
    name: string;
    education_stage_id: string;
    grade_level: number;
  };
  academic_year: string;
  base_score: number;
  average_score: number;
  distribution: { excellent: number; good: number; fair: number; poor: number };
  total_students: number;
  students: ClassroomReportStudent[];
  rank_mode: 'risk' | 'score';
}

function formatProfileFullName(profile: Record<string, unknown> | null | undefined) {
  const prefix = ((profile?.prefix as string) || '').trim();
  const fullName = ((profile?.full_name as string) || '').trim();
  if (!prefix) return fullName;
  return fullName.startsWith(prefix) ? fullName : `${prefix}${fullName}`;
}

async function getTeacherAssignedClassroomIds(profileId: string) {
  const supabase = await createAdminClient();
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!teacher?.id) return [];

  const { data } = await supabase
    .from('teacher_classrooms')
    .select('classroom_id')
    .eq('teacher_id', teacher.id)
    .in('assignment_role', ['homeroom', 'assistant']);

  return Array.from(new Set((data || []).map((row) => row.classroom_id as string).filter(Boolean)));
}

function rankRows(
  rows: StudentRankingRow[],
  rankMode: 'risk' | 'score',
  getGroupKey?: (row: StudentRankingRow) => string,
) {
  const groups = new Map<string, StudentRankingRow[]>();
  for (const row of rows) {
    const key = getGroupKey ? getGroupKey(row) : 'all';
    groups.set(key, [...(groups.get(key) || []), row]);
  }

  for (const groupRows of groups.values()) {
    groupRows
      .sort((a, b) => (
        rankMode === 'risk'
          ? a.current_score - b.current_score || b.total_deducted - a.total_deducted
          : b.current_score - a.current_score || a.total_deducted - b.total_deducted
      ) || a.full_name.localeCompare(b.full_name))
      .forEach((row, index) => {
        if (!getGroupKey) row.rank_overall = index + 1;
        else if (getGroupKey(row).startsWith('classroom:')) row.rank_classroom = index + 1;
        else row.rank_grade = index + 1;
      });
  }
}

export async function getStudentRankingReport(params: StudentRankingReportParams = {}) {
  return withAuth(async () => {
    const supabase = await createClient();

    const { data: academicYears } = await supabase
      .from('academic_years')
      .select('id, name, base_score, is_current')
      .order('name', { ascending: false });

    const selectedYear = (academicYears || []).find((year: any) => year.id === params.academic_year_id)
      || (academicYears || []).find((year: any) => year.is_current)
      || (academicYears || [])[0];
    const academicYearId = selectedYear?.id as string | undefined;
    const baseScore = (selectedYear?.base_score as number | undefined) || 100;

    let studentRows: Record<string, unknown>[] = [];
    if (academicYearId) {
      const { data } = await supabase
        .from('student_enrollments')
        .select(`
          students!inner(
            id,
            student_id_number,
            profiles!inner(full_name, prefix)
          ),
          classrooms!inner(name, grade_level_id, grade_level, education_stage_id, grade_levels(name, level_no))
        `)
        .eq('academic_year_id', academicYearId)
        .in('enrollment_status', ['active', 'promoted', 'repeated', 'transferred', 'graduated']);
      studentRows = (data || []) as Record<string, unknown>[];
    }

    if (studentRows.length === 0) {
      const { data } = await supabase
        .from('students')
        .select(`
          id,
          student_id_number,
          profiles!inner(full_name, prefix),
          classrooms!inner(name, grade_level_id, grade_level, education_stage_id, grade_levels(name, level_no))
        `)
        .eq('current_status', 'active');
      studentRows = (data || []) as Record<string, unknown>[];
    }

    let students = studentRows.map((row) => {
      if ('students' in row) {
        const student = row.students as Record<string, unknown>;
        return {
          id: student?.id as string,
          student_id_number: student?.student_id_number as string,
          profiles: student?.profiles as Record<string, unknown>,
          classrooms: row.classrooms as Record<string, unknown>,
        };
      }
      return row;
    });

    if (params.grade_level_id) {
      students = students.filter((s) => ((s.classrooms as Record<string, unknown>)?.grade_level_id as string) === params.grade_level_id);
    } else if (params.grade_level) {
      students = students.filter((s) => ((s.classrooms as Record<string, unknown>)?.grade_level as number) === params.grade_level);
    }

    if (params.classroom_name) {
      students = students.filter((s) => ((s.classrooms as Record<string, unknown>)?.name as string) === params.classroom_name);
    }

    const search = (params.search || '').trim().toLowerCase();
    if (search) {
      students = students.filter((s) => {
        const fullName = formatProfileFullName(s.profiles as Record<string, unknown>).toLowerCase();
        const studentNumber = String(s.student_id_number || '').toLowerCase();
        return fullName.includes(search) || studentNumber.includes(search);
      });
    }

    const studentIds = students.map((s) => s.id as string).filter(Boolean);
    const transactionsByStudent = new Map<string, StudentRankingRow['recent_transactions']>();
    const summaryByStudent = new Map<string, {
      totalDeducted: number;
      totalAdded: number;
      transactionCount: number;
      deductCount: number;
      addCount: number;
      latestRecordedAt?: string;
    }>();

    if (studentIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        let query = supabase
          .from('score_transactions')
          .select(`
            id,
            student_id,
            points,
            note,
            recorded_at,
            category_name_at_record,
            category_type_at_record,
            score_categories(name, type),
            profiles!score_transactions_recorded_by_fkey(full_name)
          `)
          .in('student_id', chunk)
          .eq('status', 'approved')
          .order('recorded_at', { ascending: false });

        if (academicYearId) query = query.eq('academic_year_id', academicYearId);
        if (params.from_date) query = query.gte('recorded_at', params.from_date);
        if (params.to_date) {
          const toDate = /^\d{4}-\d{2}-\d{2}$/.test(params.to_date)
            ? `${params.to_date}T23:59:59.999`
            : params.to_date;
          query = query.lte('recorded_at', toDate);
        }

        const { data } = await query;
        for (const tx of (data || []) as Record<string, unknown>[]) {
          const studentId = tx.student_id as string;
          const points = tx.points as number;
          const summary = summaryByStudent.get(studentId) || {
            totalDeducted: 0,
            totalAdded: 0,
            transactionCount: 0,
            deductCount: 0,
            addCount: 0,
            latestRecordedAt: undefined,
          };

          summary.transactionCount++;
          if (points < 0) {
            summary.totalDeducted += Math.abs(points);
            summary.deductCount++;
          } else {
            summary.totalAdded += points;
            summary.addCount++;
          }
          const recordedAt = tx.recorded_at as string | undefined;
          if (recordedAt && (!summary.latestRecordedAt || recordedAt > summary.latestRecordedAt)) {
            summary.latestRecordedAt = recordedAt;
          }
          summaryByStudent.set(studentId, summary);

          const recent = transactionsByStudent.get(studentId) || [];
          if (recent.length < 8) {
            recent.push({
              id: tx.id as string,
              category_name: (tx.category_name_at_record as string) || ((tx.score_categories as Record<string, unknown>)?.name as string) || '',
              category_type: (tx.category_type_at_record as string) || ((tx.score_categories as Record<string, unknown>)?.type as string) || '',
              points,
              note: tx.note as string | undefined,
              recorded_at: tx.recorded_at as string,
              recorded_by_name: ((tx.profiles as Record<string, unknown>)?.full_name as string) || '',
            });
            transactionsByStudent.set(studentId, recent);
          }
        }
      }
    }

    const rows: StudentRankingRow[] = students.map((student) => {
      const classroom = student.classrooms as Record<string, unknown>;
      const summary = summaryByStudent.get(student.id as string) || {
        totalDeducted: 0,
        totalAdded: 0,
        transactionCount: 0,
        deductCount: 0,
        addCount: 0,
        latestRecordedAt: undefined,
      };

      return {
        id: student.id as string,
        student_id_number: student.student_id_number as string,
        full_name: formatProfileFullName(student.profiles as Record<string, unknown>),
        classroom_name: (classroom?.name as string) || '',
        grade_level_id: (classroom?.grade_level_id as string) || '',
        grade_level_name: ((classroom?.grade_levels as Record<string, unknown>)?.name as string) || '',
        grade_level: (classroom?.grade_level as number) || 0,
        current_score: baseScore - summary.totalDeducted + summary.totalAdded,
        total_deducted: summary.totalDeducted,
        total_added: summary.totalAdded,
        transaction_count: summary.transactionCount,
        deduct_count: summary.deductCount,
        add_count: summary.addCount,
        latest_recorded_at: summary.latestRecordedAt,
        rank_overall: 0,
        rank_classroom: 0,
        rank_grade: 0,
        recent_transactions: transactionsByStudent.get(student.id as string) || [],
      };
    });

    const rankMode = params.rank_mode || 'risk';
    rankRows(rows, rankMode);
    rankRows(rows, rankMode, (row) => `classroom:${row.classroom_name}`);
    rankRows(rows, rankMode, (row) => `grade:${row.grade_level_id || row.grade_level}`);

    const sortBy = params.sort_by || 'current_score';
    rows.sort((a, b) => {
      if (sortBy === 'deducted') return b.total_deducted - a.total_deducted || a.current_score - b.current_score;
      if (sortBy === 'transaction_count') return b.transaction_count - a.transaction_count || b.total_deducted - a.total_deducted;
      if (sortBy === 'latest') return (b.latest_recorded_at || '').localeCompare(a.latest_recorded_at || '');
      if (sortBy === 'name') return a.full_name.localeCompare(b.full_name);
      return a.current_score - b.current_score || b.total_deducted - a.total_deducted;
    });

    const totalStudents = rows.length;
    const totalScore = rows.reduce((sum, row) => sum + row.current_score, 0);
    const totalDeducted = rows.reduce((sum, row) => sum + row.total_deducted, 0);
    const totalAdded = rows.reduce((sum, row) => sum + row.total_added, 0);
    const atRiskCount = rows.filter((row) => row.current_score < baseScore - 20 || row.total_deducted >= 20).length;

    return {
      success: true,
      data: {
        academic_year: selectedYear?.name || '',
        academic_year_id: academicYearId || '',
        base_score: baseScore,
        summary: {
          total_students: totalStudents,
          average_score: totalStudents > 0 ? Math.round(totalScore / totalStudents) : baseScore,
          min_score: totalStudents > 0 ? Math.min(...rows.map((row) => row.current_score)) : baseScore,
          max_score: totalStudents > 0 ? Math.max(...rows.map((row) => row.current_score)) : baseScore,
          total_deducted: totalDeducted,
          total_added: totalAdded,
          at_risk_count: atRiskCount,
        },
        rows,
      },
    };
  });
}

export async function getDashboardStats() {
  return withAuth(async () => {
    const supabase = await createClient();

    // Get current academic year
    const acYearRes = await supabase
      .from('academic_years')
      .select('id, base_score')
      .eq('is_current', true)
      .single();
    const acYear = acYearRes.data as { id: string; base_score: number } | null;
    const acYearId = acYear?.id;
    const baseScore = acYear?.base_score || 100;

    // Parallel: independent counts
    const [studentCountRes, classroomCountRes, teacherCountRes, thresholdsRes, studentsRes] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('current_status', 'active'),
      supabase.from('classrooms').select('*', { count: 'exact', head: true }),
      supabase.from('teachers').select('*', { count: 'exact', head: true }),
      supabase.from('settings').select('value').eq('key', 'thresholds').single(),
      supabase.from('students').select('id, profiles!inner(full_name, prefix)').eq('current_status', 'active'),
    ]);

    const thresholds: Array<{ deducted: number }> = (thresholdsRes.data?.value as any) || [];
    const firstThreshold = thresholds.length > 0 ? thresholds[0].deducted : 20;
    const allStudents = studentsRes.data || [];
    const studentIds = allStudents.map((s: any) => s.id);

    // ── Bulk-fetch ALL score_transactions ──
    let allTransactions: { student_id: string; points: number }[] = [];
    if (studentIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        let txQuery = supabase
          .from('score_transactions')
          .select('student_id, points')
          .in('student_id', chunk)
          .eq('status', 'approved');
        if (acYearId) txQuery = txQuery.eq('academic_year_id', acYearId);
        const { data } = await txQuery;
        if (data) allTransactions.push(...data);
      }
    }

    // Build score lookup
    const scoreMap = new Map<string, number>();
    for (const tx of allTransactions) {
      const current = scoreMap.get(tx.student_id) || 0;
      scoreMap.set(tx.student_id, current + tx.points);
    }

    let totalScoreSum = 0;
    let atRiskCount = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let fairCount = 0;
    let poorCount = 0;

    for (const student of allStudents) {
      const s = student as any;
      // Calculate score: start with base, subtract all deductions, add all additions
      const netPoints = scoreMap.get(s.id) || 0;
      const totalDeducted = allTransactions
        .filter(t => t.student_id === s.id && t.points < 0)
        .reduce((sum, t) => sum + Math.abs(t.points), 0);
      const totalAdded = allTransactions
        .filter(t => t.student_id === s.id && t.points > 0)
        .reduce((sum, t) => sum + t.points, 0);

      const score = baseScore + totalAdded - totalDeducted;
      totalScoreSum += score;

      if (totalDeducted >= firstThreshold) atRiskCount++;

      if (score >= baseScore) excellentCount++;
      else if (score >= baseScore - 20) goodCount++;
      else if (score >= baseScore - 40) fairCount++;
      else poorCount++;
    }

    const studentCount = allStudents.length;

    return {
      success: true,
      data: {
        total_students: studentCountRes.count || 0,
        active_students: studentCount,
        total_classrooms: classroomCountRes.count || 0,
        total_teachers: teacherCountRes.count || 0,
        average_score: studentCount > 0 ? Math.round(totalScoreSum / studentCount) : baseScore,
        at_risk_count: atRiskCount,
        score_distribution: {
          excellent: excellentCount,
          good: goodCount,
          fair: fairCount,
          poor: poorCount,
        },
      },
    };
  });
}

export async function getSchoolStatisticsReport(academicYearId?: string) {
  return withAuth<SchoolStatisticsReportData>(async (profile) => {
    if (!canApproveScores(profile)) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดูสถิติโรงเรียน' } };
    }

    const supabase = await createAdminClient();
    const { data: academicYears } = await supabase
      .from('academic_years')
      .select('id, name, base_score, is_current')
      .order('name', { ascending: false });

    const selectedYear = (academicYears || []).find((year: any) => year.id === academicYearId)
      || (academicYears || []).find((year: any) => year.is_current)
      || (academicYears || [])[0];

    if (!selectedYear?.id) {
      return {
        success: true,
        data: {
          academic_years: [],
          academic_year: '',
          academic_year_id: '',
          base_score: 100,
          summary: {
            total_students: 0,
            average_score: 100,
            min_score: 100,
            max_score: 100,
            total_deducted: 0,
            total_added: 0,
            transaction_count: 0,
            at_risk_count: 0,
          },
          score_distribution: [],
          category_breakdown: [],
          classroom_breakdown: [],
          grade_breakdown: [],
          monthly_trend: [],
          top_risk_students: [],
        },
      };
    }

    const selectedAcademicYearId = selectedYear.id as string;
    const baseScore = (selectedYear.base_score as number | undefined) || 100;

    const { data: enrollmentRows } = await supabase
      .from('student_enrollments')
      .select(`
        student_id,
        enrollment_status,
        students!inner(
          id,
          student_id_number,
          profiles!inner(full_name, prefix)
        ),
        classrooms!inner(
          id,
          name,
          grade_level,
          grade_level_id,
          grade_levels(name, level_no)
        )
      `)
      .eq('academic_year_id', selectedAcademicYearId)
      .in('enrollment_status', ['active', 'promoted', 'repeated']);

    const students = ((enrollmentRows || []) as Record<string, unknown>[]).map((row) => {
      const student = row.students as Record<string, unknown>;
      const classroom = row.classrooms as Record<string, unknown>;
      return {
        id: student.id as string,
        student_id_number: student.student_id_number as string,
        full_name: formatProfileFullName(student.profiles as Record<string, unknown>),
        classroom_id: classroom.id as string,
        classroom_name: classroom.name as string,
        grade_level_id: (classroom.grade_level_id as string) || '',
        grade_level_name: ((classroom.grade_levels as Record<string, unknown>)?.name as string) || String(classroom.grade_level || ''),
      };
    });

    const studentIds = students.map((student) => student.id);
    const scoreByStudent = new Map<string, {
      totalDeducted: number;
      totalAdded: number;
      transactionCount: number;
    }>();
    const categoryMap = new Map<string, { name: string; type: string; total_points: number; count: number }>();
    const monthlyMap = new Map<string, { month: string; deducted: number; added: number; transaction_count: number }>();

    if (studentIds.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize);
        const { data: transactions } = await supabase
          .from('score_transactions')
          .select('student_id, points, recorded_at, category_name_at_record, category_type_at_record, score_categories(name, type)')
          .eq('academic_year_id', selectedAcademicYearId)
          .eq('status', 'approved')
          .in('student_id', chunk);

        for (const tx of (transactions || []) as Record<string, unknown>[]) {
          const studentId = tx.student_id as string;
          const points = Number(tx.points || 0);
          const summary = scoreByStudent.get(studentId) || { totalDeducted: 0, totalAdded: 0, transactionCount: 0 };
          summary.transactionCount++;
          if (points < 0) summary.totalDeducted += Math.abs(points);
          else summary.totalAdded += points;
          scoreByStudent.set(studentId, summary);

          const category = tx.score_categories as Record<string, unknown> | null;
          const categoryName = (tx.category_name_at_record as string) || (category?.name as string) || 'Uncategorized';
          const categoryType = (tx.category_type_at_record as string) || (category?.type as string) || (points < 0 ? 'deduct' : 'add');
          const categoryKey = `${categoryType}:${categoryName}`;
          const categorySummary = categoryMap.get(categoryKey) || { name: categoryName, type: categoryType, total_points: 0, count: 0 };
          categorySummary.count++;
          categorySummary.total_points += Math.abs(points);
          categoryMap.set(categoryKey, categorySummary);

          const recordedAt = tx.recorded_at as string | undefined;
          if (recordedAt) {
            const month = recordedAt.slice(0, 7);
            const monthly = monthlyMap.get(month) || { month, deducted: 0, added: 0, transaction_count: 0 };
            monthly.transaction_count++;
            if (points < 0) monthly.deducted += Math.abs(points);
            else monthly.added += points;
            monthlyMap.set(month, monthly);
          }
        }
      }
    }

    const classroomMap = new Map<string, { name: string; total_students: number; score_sum: number; total_deducted: number; transaction_count: number }>();
    const gradeMap = new Map<string, { name: string; total_students: number; score_sum: number; total_deducted: number; transaction_count: number }>();
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

    const studentScores = students.map((student) => {
      const summary = scoreByStudent.get(student.id) || { totalDeducted: 0, totalAdded: 0, transactionCount: 0 };
      const currentScore = baseScore - summary.totalDeducted + summary.totalAdded;
      if (currentScore >= baseScore) distribution.excellent++;
      else if (currentScore >= baseScore - 20) distribution.good++;
      else if (currentScore >= baseScore - 40) distribution.fair++;
      else distribution.poor++;

      const classroomSummary = classroomMap.get(student.classroom_id) || {
        name: student.classroom_name,
        total_students: 0,
        score_sum: 0,
        total_deducted: 0,
        transaction_count: 0,
      };
      classroomSummary.total_students++;
      classroomSummary.score_sum += currentScore;
      classroomSummary.total_deducted += summary.totalDeducted;
      classroomSummary.transaction_count += summary.transactionCount;
      classroomMap.set(student.classroom_id, classroomSummary);

      const gradeKey = student.grade_level_id || student.grade_level_name;
      const gradeSummary = gradeMap.get(gradeKey) || {
        name: student.grade_level_name,
        total_students: 0,
        score_sum: 0,
        total_deducted: 0,
        transaction_count: 0,
      };
      gradeSummary.total_students++;
      gradeSummary.score_sum += currentScore;
      gradeSummary.total_deducted += summary.totalDeducted;
      gradeSummary.transaction_count += summary.transactionCount;
      gradeMap.set(gradeKey, gradeSummary);

      return {
        ...student,
        current_score: currentScore,
        total_deducted: summary.totalDeducted,
        transaction_count: summary.transactionCount,
      };
    });

    const totalStudents = studentScores.length;
    const totalScore = studentScores.reduce((sum, row) => sum + row.current_score, 0);
    const totalDeducted = studentScores.reduce((sum, row) => sum + row.total_deducted, 0);
    const totalAdded = Array.from(scoreByStudent.values()).reduce((sum, row) => sum + row.totalAdded, 0);
    const transactionCount = Array.from(scoreByStudent.values()).reduce((sum, row) => sum + row.transactionCount, 0);

    return {
      success: true,
      data: {
        academic_years: ((academicYears || []) as Record<string, unknown>[]).map((year) => ({
          id: year.id as string,
          name: year.name as string,
          is_current: Boolean(year.is_current),
        })),
        academic_year: (selectedYear.name as string) || '',
        academic_year_id: selectedAcademicYearId,
        base_score: baseScore,
        summary: {
          total_students: totalStudents,
          average_score: totalStudents > 0 ? Math.round(totalScore / totalStudents) : baseScore,
          min_score: totalStudents > 0 ? Math.min(...studentScores.map((row) => row.current_score)) : baseScore,
          max_score: totalStudents > 0 ? Math.max(...studentScores.map((row) => row.current_score)) : baseScore,
          total_deducted: totalDeducted,
          total_added: totalAdded,
          transaction_count: transactionCount,
          at_risk_count: studentScores.filter((row) => row.current_score < baseScore - 20 || row.total_deducted >= 20).length,
        },
        score_distribution: [
          { name: 'excellent', count: distribution.excellent },
          { name: 'good', count: distribution.good },
          { name: 'fair', count: distribution.fair },
          { name: 'poor', count: distribution.poor },
        ],
        category_breakdown: Array.from(categoryMap.values())
          .sort((a, b) => b.count - a.count || b.total_points - a.total_points)
          .slice(0, 10),
        classroom_breakdown: Array.from(classroomMap.values())
          .map((row) => ({
            name: row.name,
            total_students: row.total_students,
            average_score: row.total_students > 0 ? Math.round(row.score_sum / row.total_students) : baseScore,
            total_deducted: row.total_deducted,
            transaction_count: row.transaction_count,
          }))
          .sort((a, b) => b.total_deducted - a.total_deducted)
          .slice(0, 12),
        grade_breakdown: Array.from(gradeMap.values())
          .map((row) => ({
            name: row.name,
            total_students: row.total_students,
            average_score: row.total_students > 0 ? Math.round(row.score_sum / row.total_students) : baseScore,
            total_deducted: row.total_deducted,
            transaction_count: row.transaction_count,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'th')),
        monthly_trend: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
        top_risk_students: studentScores
          .sort((a, b) => a.current_score - b.current_score || b.total_deducted - a.total_deducted)
          .slice(0, 10)
          .map((row) => ({
            id: row.id,
            student_id_number: row.student_id_number,
            full_name: row.full_name,
            classroom_name: row.classroom_name,
            current_score: row.current_score,
            total_deducted: row.total_deducted,
          })),
      },
    };
  });
}

export async function getIndividualReport(studentId: string, academicYearId?: string) {
  return withAuth(async (profile) => {
    const isStudentOnly = hasRole(profile, 'student') && !canApproveScores(profile) && !hasRole(profile, 'teacher');
    const supabase = isStudentOnly ? await createAdminClient() : await createClient();
    let effectiveAcademicYearId = academicYearId;

    if (isStudentOnly) {
      const { data: currentYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      if (!currentYear?.id) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'ยังไม่ได้ตั้งปีการศึกษาปัจจุบัน' } };
      }

      const { data: currentEnrollment } = await supabase
        .from('student_enrollments')
        .select('id, students!inner(profile_id)')
        .eq('student_id', studentId)
        .eq('academic_year_id', currentYear.id)
        .eq('students.profile_id', profile.id)
        .maybeSingle();

      if (!currentEnrollment) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'ดูได้เฉพาะข้อมูลของตนเองในปีการศึกษาปัจจุบัน' } };
      }

      effectiveAcademicYearId = currentYear.id as string;
    }

    let yearQuery = supabase
      .from('academic_years')
      .select('id, base_score, name')
      .limit(1);
    yearQuery = effectiveAcademicYearId
      ? yearQuery.eq('id', effectiveAcademicYearId)
      : yearQuery.eq('is_current', true);
    const { data: yearRows } = await yearQuery;
    const acYear = (yearRows || [])[0];

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select(`
        *,
        profiles!inner(full_name, prefix),
        classrooms!inner(name, grade_level, education_stage_id)
      `)
      .eq('id', studentId)
      .single();

    if (!student) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูลนักเรียน' } };
    }

    // Get score transactions
    const { data: transactions } = await supabase
      .from('score_transactions')
      .select(`
        *,
        score_categories(name, type),
        profiles!score_transactions_recorded_by_fkey(full_name)
      `)
      .eq('student_id', studentId)
      .eq('academic_year_id', acYear?.id)
      .eq('status', 'approved')
      .order('recorded_at', { ascending: false });

    const summary = await getScoreSummary(studentId, acYear?.id);

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          full_name: formatProfileFullName(student.profiles as Record<string, unknown>),
          student_id_number: student.student_id_number,
          classroom_name: (student.classrooms as any)?.name || '',
          grade_level: (student.classrooms as any)?.grade_level,
          education_stage_id: (student.classrooms as any)?.education_stage_id,
        },
        academic_year: acYear?.name || '',
        base_score: acYear?.base_score || 100,
        summary,
        transactions: (transactions || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          category_name: (t.category_name_at_record as string) || (t.score_categories as Record<string, unknown>)?.name as string || '',
          category_type: (t.category_type_at_record as string) || (t.score_categories as Record<string, unknown>)?.type as string || '',
          points: t.points as number,
          note: t.note as string | undefined,
          recorded_at: t.recorded_at as string,
          recorded_by_name: (t.profiles as Record<string, unknown>)?.full_name as string || '',
        })),
      },
    };
  });
}

export async function getClassroomReport(classroomId: string, rankMode: 'risk' | 'score' = 'risk', academicYearId?: string) {
  return withAuth<ClassroomReportData>(async (profile) => {
    const canViewAll = canApproveScores(profile);
    const isTeacher = hasRole(profile, 'teacher');
    if (!canViewAll && !isTeacher) {
      return { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ดูรายงานห้องเรียน' } };
    }

    if (!canViewAll) {
      const assignedClassroomIds = await getTeacherAssignedClassroomIds(profile.id);
      if (!assignedClassroomIds.includes(classroomId)) {
        return { success: false, error: { code: 'FORBIDDEN', message: 'ดูได้เฉพาะห้องเรียนที่ได้รับมอบหมาย' } };
      }
    }

    const supabase = await createAdminClient();

    let acYearQuery = supabase
      .from('academic_years')
      .select('id, base_score, name')
      .limit(1);
    acYearQuery = academicYearId
      ? acYearQuery.eq('id', academicYearId)
      : acYearQuery.eq('is_current', true);
    const acYearRes = await acYearQuery;
    let acYear = (acYearRes.data || [])[0] as { id: string; base_score: number; name: string } | null;

    // Get classroom info
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', classroomId)
      .single();

    if (!classroom) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบห้องเรียน' } };
    }

    if (!acYear && (classroom as any).academic_year_id) {
      const { data: classroomYear } = await supabase
        .from('academic_years')
        .select('id, base_score, name')
        .eq('id', (classroom as any).academic_year_id)
        .maybeSingle();
      acYear = classroomYear as { id: string; base_score: number; name: string } | null;
    }

    const acYearId = acYear?.id;
    const baseScore = acYear?.base_score || 100;

    // Get students enrolled in this classroom for the selected academic year.
    const { data: enrollmentRows } = await supabase
      .from('student_enrollments')
      .select(`
        students!inner(
          id,
          student_id_number,
          profiles!inner(full_name, prefix)
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('academic_year_id', acYearId || '')
      .in('enrollment_status', ['active', 'promoted', 'repeated', 'transferred', 'graduated']);

    const students = (enrollmentRows || [])
      .map((row: Record<string, unknown>) => row.students as Record<string, unknown>)
      .filter(Boolean)
      .sort((a, b) => String(a.student_id_number || '').localeCompare(String(b.student_id_number || '')));

    if (!students || students.length === 0) {
      return {
        success: true,
        data: {
          classroom: {
            id: (classroom as any).id,
            name: (classroom as any).name,
            education_stage_id: (classroom as any).education_stage_id,
            grade_level: (classroom as any).grade_level,
          },
          academic_year: acYear?.name || '',
          base_score: baseScore,
          average_score: baseScore,
          distribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
          total_students: 0,
          students: [] as ClassroomReportStudent[],
          rank_mode: rankMode,
        },
      };
    }

    // ── Bulk-fetch score_transactions for these students ──
    const studentIds = students.map((s: any) => s.id);
    let allTransactions: { student_id: string; points: number }[] = [];
    const chunkSize = 1000;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const chunk = studentIds.slice(i, i + chunkSize);
      let txQuery = supabase
        .from('score_transactions')
        .select('student_id, points, status')
        .in('student_id', chunk)
        .eq('status', 'approved');
      if (acYearId) txQuery = txQuery.eq('academic_year_id', acYearId);
      const { data } = await txQuery;
      if (data) allTransactions.push(...data);
    }

    // Build summary per student
    const summaryMap = new Map<string, { totalDeducted: number; totalAdded: number; currentScore: number }>();
    for (const sid of studentIds) {
      const txns = allTransactions.filter(t => t.student_id === sid);
      const totalDeducted = txns.filter(t => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0);
      const totalAdded = txns.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0);
      summaryMap.set(sid, {
        totalDeducted,
        totalAdded,
        currentScore: baseScore - totalDeducted + totalAdded,
      });
    }

    const studentStats: Omit<ClassroomReportStudent, 'rank'>[] = [];
    let totalScoreSum = 0;
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

    for (const student of students) {
      const s = student as any;
      const summary = summaryMap.get(s.id) || { totalDeducted: 0, totalAdded: 0, currentScore: baseScore };
      totalScoreSum += summary.currentScore;

      if (summary.currentScore >= baseScore) distribution.excellent++;
      else if (summary.currentScore >= baseScore - 20) distribution.good++;
      else if (summary.currentScore >= baseScore - 40) distribution.fair++;
      else distribution.poor++;

      studentStats.push({
        id: s.id,
        full_name: formatProfileFullName(s.profiles as Record<string, unknown>),
        student_id_number: s.student_id_number,
        total_deducted: summary.totalDeducted,
        total_added: summary.totalAdded,
        current_score: summary.currentScore,
        deduct_count: 0,
        add_count: 0,
      });
    }

    studentStats.sort((a, b) => (
      rankMode === 'risk'
        ? a.current_score - b.current_score || b.total_deducted - a.total_deducted
        : b.current_score - a.current_score || a.total_deducted - b.total_deducted
    ) || a.full_name.localeCompare(b.full_name));

    return {
      success: true,
      data: {
        classroom: {
          id: (classroom as any).id,
          name: (classroom as any).name,
          education_stage_id: (classroom as any).education_stage_id,
          grade_level: (classroom as any).grade_level,
        },
        academic_year: acYear?.name || '',
        base_score: baseScore,
        average_score: studentStats.length > 0
          ? Math.round(totalScoreSum / studentStats.length)
          : baseScore,
        distribution,
        total_students: studentStats.length,
        students: studentStats.map((student, index) => ({
          ...student,
          rank: index + 1,
        })),
        rank_mode: rankMode,
      },
    };
  });
}

export async function getThresholdReport(academicYearId?: string) {
  return withAuth(async (profile) => {
    const supabase = await createClient();

    let acYearQuery = supabase
      .from('academic_years')
      .select('id, base_score, name')
      .limit(1);
    acYearQuery = academicYearId
      ? acYearQuery.eq('id', academicYearId)
      : acYearQuery.eq('is_current', true);
    const acYearRes = await acYearQuery;
    const acYear = (acYearRes.data || [])[0] as { id: string; base_score: number; name: string } | null;
    const acYearId = acYear?.id;
    const baseScore = acYear?.base_score || 100;

    // Get thresholds
    const thresholdsRes = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'thresholds')
      .single();
    const thresholds: Array<{
      deducted: number;
      action: string;
      color: string;
    }> = (thresholdsRes.data?.value as any) || [];

    // Get all active students
    const { data: enrollmentRows } = await supabase
      .from('student_enrollments')
      .select(`
        students!inner(
          id,
          student_id_number,
          profiles!inner(full_name, prefix)
        ),
        classrooms!inner(name, grade_level)
      `)
      .eq('academic_year_id', acYearId || '')
      .in('enrollment_status', ['active', 'promoted', 'repeated', 'transferred', 'graduated']);

    const students = (enrollmentRows || [])
      .map((row: Record<string, unknown>) => ({
        ...((row.students as Record<string, unknown>) || {}),
        classrooms: row.classrooms,
      }))
      .filter((student: Record<string, unknown>) => Boolean(student.id));

    if (!students || students.length === 0) {
      await logAction({
        actorId: profile.id,
        event: 'view_report',
        resourceType: 'report',
        metadata: {
          report: 'threshold',
          academic_year_id: acYearId || null,
          result_count: 0,
        },
      });
      return {
        success: true,
        data: {
          academic_year: acYear?.name || '',
          base_score: baseScore,
          thresholds,
          students: [],
          total_at_risk: 0,
        },
      };
    }

    // ── Bulk-fetch ALL score_transactions (no N+1 per student) ──
    const studentIds = students.map((s: any) => s.id);
    let allTransactions: { student_id: string; points: number; status: string }[] = [];

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

    // Build score lookup: student_id -> { deducted, added, deductCount, addCount }
    const scoreMap = new Map<string, { deducted: number; added: number; deductCount: number; addCount: number }>();
    for (const tx of allTransactions) {
      if (!scoreMap.has(tx.student_id)) {
        scoreMap.set(tx.student_id, { deducted: 0, added: 0, deductCount: 0, addCount: 0 });
      }
      const entry = scoreMap.get(tx.student_id)!;
      if (tx.points < 0) {
        entry.deducted += Math.abs(tx.points);
        entry.deductCount++;
      } else {
        entry.added += tx.points;
        entry.addCount++;
      }
    }

    // Compute report for each student
    const reportData: StudentThresholdInfo[] = [];

    for (const student of students) {
      const s = student as any;
      const scores = scoreMap.get(s.id) || { deducted: 0, added: 0, deductCount: 0, addCount: 0 };
      const currentScore = baseScore - scores.deducted + scores.added;

      // Find applicable threshold
      let thresholdIndex = -1;
      let thresholdAction = '';
      let thresholdColor = '';

      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (scores.deducted >= thresholds[i].deducted) {
          thresholdIndex = i;
          thresholdAction = thresholds[i].action;
          thresholdColor = thresholds[i].color;
          break;
        }
      }

      if (thresholdIndex >= 0) {
        const fullName = formatProfileFullName(s.profiles as Record<string, unknown>);
        reportData.push({
          student_id: s.id,
          first_name: fullName.split(' ')[0] || '',
          last_name: fullName.split(' ').slice(1).join(' ') || '',
          student_id_number: s.student_id_number,
          classroom_name: (s.classrooms as any)?.name || '',
          current_score: currentScore,
          deducted_total: scores.deducted,
          threshold_level: thresholdIndex + 1,
          threshold_index: thresholdIndex,
          threshold_action: thresholdAction,
          threshold_color: thresholdColor,
          deduct_count: scores.deductCount,
          add_count: scores.addCount,
        });
      }
    }

    // Sort by threshold index descending (most critical first), then by deducted total
    reportData.sort((a, b) => {
      if (b.threshold_index !== a.threshold_index) return b.threshold_index - a.threshold_index;
      return b.deducted_total - a.deducted_total;
    });

    await logAction({
      actorId: profile.id,
      event: 'view_report',
      resourceType: 'report',
      metadata: {
        report: 'threshold',
        academic_year_id: acYearId || null,
        result_count: reportData.length,
      },
    });

    return {
      success: true,
      data: {
        academic_year: acYear?.name || '',
        base_score: baseScore,
        thresholds,
        students: reportData,
        total_at_risk: reportData.length,
      },
    };
  });
}

export async function logReportExport(report: string, metadata: Record<string, unknown> = {}) {
  return withAuth(async (profile) => {
    await logAction({
      actorId: profile.id,
      event: 'export_csv',
      resourceType: 'report',
      metadata: { report, ...metadata },
    });
    return { success: true, data: null };
  });
}
