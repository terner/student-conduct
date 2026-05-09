'use server';

import { withAuth } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { listStudents, getScoreSummary } from '@/lib/db';
import type { StudentThresholdInfo } from '@/types';

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
      supabase.from('students').select('id, profiles!inner(full_name)').eq('current_status', 'active'),
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

export async function getIndividualReport(studentId: string) {
  return withAuth(async () => {
    const supabase = await createClient();

    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id, base_score, name')
      .eq('is_current', true)
      .single();

    // Get student info
    const { data: student } = await supabase
      .from('students')
      .select(`
        *,
        profiles!inner(full_name),
        classrooms!inner(name, grade_level, education_stage)
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
          full_name: (student.profiles as any)?.full_name || '',
          student_id_number: student.student_id_number,
          classroom_name: (student.classrooms as any)?.name || '',
          grade_level: (student.classrooms as any)?.grade_level,
          education_stage: (student.classrooms as any)?.education_stage,
        },
        academic_year: acYear?.name || '',
        base_score: acYear?.base_score || 100,
        summary,
        transactions: (transactions || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          category_name: (t.score_categories as Record<string, unknown>)?.name as string || '',
          category_type: (t.score_categories as Record<string, unknown>)?.type as string || '',
          points: t.points as number,
          note: t.note as string | undefined,
          recorded_at: t.recorded_at as string,
          recorded_by_name: (t.profiles as Record<string, unknown>)?.full_name as string || '',
        })),
      },
    };
  });
}

export async function getClassroomReport(classroomId: string) {
  return withAuth(async () => {
    const supabase = await createClient();

    const acYearRes = await supabase
      .from('academic_years')
      .select('id, base_score, name')
      .eq('is_current', true)
      .single();
    const acYear = acYearRes.data as { id: string; base_score: number; name: string } | null;
    const acYearId = acYear?.id;
    const baseScore = acYear?.base_score || 100;

    // Get classroom info
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', classroomId)
      .single();

    if (!classroom) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบห้องเรียน' } };
    }

    // Get students in classroom
    const { data: students } = await supabase
      .from('students')
      .select(`
        id,
        student_id_number,
        profiles!inner(full_name)
      `)
      .eq('classroom_id', classroomId)
      .eq('current_status', 'active')
      .order('student_id_number');

    if (!students || students.length === 0) {
      return {
        success: true,
        data: {
          classroom: {
            id: (classroom as any).id,
            name: (classroom as any).name,
            education_stage: (classroom as any).education_stage,
            grade_level: (classroom as any).grade_level,
          },
          academic_year: acYear?.name || '',
          base_score: baseScore,
          average_score: baseScore,
          distribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
          total_students: 0,
          students: [],
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

    const studentStats = [];
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
        full_name: (s.profiles as any)?.full_name || '',
        student_id_number: s.student_id_number,
        total_deducted: summary.totalDeducted,
        total_added: summary.totalAdded,
        current_score: summary.currentScore,
        deduct_count: 0,
        add_count: 0,
      });
    }

    return {
      success: true,
      data: {
        classroom: {
          id: (classroom as any).id,
          name: (classroom as any).name,
          education_stage: (classroom as any).education_stage,
          grade_level: (classroom as any).grade_level,
        },
        academic_year: acYear?.name || '',
        base_score: baseScore,
        average_score: studentStats.length > 0
          ? Math.round(totalScoreSum / studentStats.length)
          : baseScore,
        distribution,
        total_students: studentStats.length,
        students: studentStats,
      },
    };
  });
}

export async function getThresholdReport() {
  return withAuth(async () => {
    const supabase = await createClient();

    const acYearRes = await supabase
      .from('academic_years')
      .select('id, base_score, name')
      .eq('is_current', true)
      .single();
    const acYear = acYearRes.data as { id: string; base_score: number; name: string } | null;
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
    const { data: students } = await supabase
      .from('students')
      .select(`
        id,
        student_id_number,
        profiles!inner(full_name),
        classrooms!inner(name, grade_level)
      `)
      .eq('current_status', 'active');

    if (!students || students.length === 0) {
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
        const fullName = (s.profiles as any)?.full_name || '';
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
