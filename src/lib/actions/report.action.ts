'use server';

import { withAuth } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import { listStudents, getScoreSummary } from '@/lib/db';
import type { StudentThresholdInfo } from '@/types';

export async function getDashboardStats() {
  return withAuth(async () => {
    const supabase = await createClient();

    // Get current academic year
    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id, base_score')
      .eq('is_current', true)
      .single();

    const acYearId = acYear?.id;
    const baseScore = acYear?.base_score || 100;

    // Count active students
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('current_status', 'active');

    // Count classrooms
    const { count: totalClassrooms } = await supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true });

    // Count teachers
    const { count: totalTeachers } = await supabase
      .from('teachers')
      .select('*', { count: 'exact', head: true });

    // Get thresholds from settings
    const { data: thresholdsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'thresholds')
      .single();

    const thresholds: Array<{ deducted: number }> = (thresholdsData?.value as Array<{ deducted: number }>) || [];
    const firstThreshold = thresholds.length > 0 ? thresholds[0].deducted : 20;

    // Get all active students with their total deductions
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, classroom_id, profiles(full_name), classrooms(name)')
      .eq('current_status', 'active');

    let totalScoreSum = 0;
    let atRiskCount = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let fairCount = 0;
    let poorCount = 0;

    for (const student of (allStudents || [])) {
      let scoreQuery = supabase
        .from('score_transactions')
        .select('points')
        .eq('student_id', student.id)
        .eq('status', 'approved');

      if (acYearId) {
        scoreQuery = scoreQuery.eq('academic_year_id', acYearId);
      }

      const { data: transactions } = await scoreQuery;

      if (!transactions) continue;

      const totalDeducted = transactions
        .filter(t => t.points < 0)
        .reduce((sum, t) => sum + Math.abs(t.points), 0);
      const totalAdded = transactions
        .filter(t => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0);

      const score = baseScore - totalDeducted + totalAdded;
      totalScoreSum += score;

      if (totalDeducted >= firstThreshold) atRiskCount++;

      if (score >= baseScore) excellentCount++;
      else if (score >= baseScore - 20) goodCount++;
      else if (score >= baseScore - 40) fairCount++;
      else poorCount++;
    }

    const studentCount = allStudents?.length || 0;

    return {
      success: true,
      data: {
        total_students: totalStudents || 0,
        active_students: studentCount,
        total_classrooms: totalClassrooms || 0,
        total_teachers: totalTeachers || 0,
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

    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id, base_score, name')
      .eq('is_current', true)
      .single();

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

    // Get score stats for each student
    const studentStats = [];
    let totalScoreSum = 0;
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    const baseScore = acYear?.base_score || 100;

    for (const student of (students || [])) {
      const summary = await getScoreSummary(student.id, acYear?.id);
      totalScoreSum += summary.current_score;

      if (summary.current_score >= baseScore) distribution.excellent++;
      else if (summary.current_score >= baseScore - 20) distribution.good++;
      else if (summary.current_score >= baseScore - 40) distribution.fair++;
      else distribution.poor++;

      studentStats.push({
        id: student.id,
        full_name: (student.profiles as any)?.full_name || '',
        student_id_number: student.student_id_number,
        ...summary,
      });
    }

    return {
      success: true,
      data: {
        classroom: {
          id: classroom.id,
          name: classroom.name,
          education_stage: classroom.education_stage,
          grade_level: classroom.grade_level,
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

    const { data: acYear } = await supabase
      .from('academic_years')
      .select('id, base_score, name')
      .eq('is_current', true)
      .single();

    const baseScore = acYear?.base_score || 100;

    // Get thresholds
    const { data: thresholdsData } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'thresholds')
      .single();

    const thresholds: Array<{
      deducted: number;
      action: string;
      color: string;
    }> = (thresholdsData?.value as Array<{
      deducted: number;
      action: string;
      color: string;
    }>) || [];

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

    const reportData: StudentThresholdInfo[] = [];

    for (const student of (students || [])) {
      // Get score transactions
      const { data: transactions } = await supabase
        .from('score_transactions')
        .select('points, status')
        .eq('student_id', student.id)
        .eq('academic_year_id', acYear?.id)
        .eq('status', 'approved');

      const totalDeducted = (transactions || [])
        .filter(t => t.points < 0)
        .reduce((sum, t) => sum + Math.abs(t.points), 0);
      const totalAdded = (transactions || [])
        .filter(t => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0);
      const currentScore = baseScore - totalDeducted + totalAdded;
      const deductCount = (transactions || []).filter(t => t.points < 0).length;
      const addCount = (transactions || []).filter(t => t.points > 0).length;

      // Find applicable threshold
      let thresholdIndex = -1;
      let thresholdAction = '';
      let thresholdColor = '';

      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (totalDeducted >= thresholds[i].deducted) {
          thresholdIndex = i;
          thresholdAction = thresholds[i].action;
          thresholdColor = thresholds[i].color;
          break;
        }
      }

      if (thresholdIndex >= 0) {
        reportData.push({
          student_id: student.id,
          first_name: ((student.profiles as any)?.full_name || '').split(' ')[0] || '',
          last_name: ((student.profiles as any)?.full_name || '').split(' ').slice(1).join(' ') || '',
          student_id_number: student.student_id_number,
          classroom_name: (student.classrooms as any)?.name || '',
          current_score: currentScore,
          deducted_total: totalDeducted,
          threshold_level: thresholdIndex + 1,
          threshold_index: thresholdIndex,
          threshold_action: thresholdAction,
          threshold_color: thresholdColor,
          deduct_count: deductCount,
          add_count: addCount,
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
