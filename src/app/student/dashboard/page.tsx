'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { createClient } from '@/lib/supabase/client';

export default function StudentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single();

      if (!profile) { setLoading(false); return; }

      // Get student record
      const { data: student } = await supabase
        .from('students')
        .select('id, student_id_number, classrooms(name, grade_level, education_stage)')
        .eq('profile_id', profile.id)
        .single();

      if (!student) { setLoading(false); return; }
      setStudentInfo(student);

      // Get academic year
      const { data: acYear } = await supabase
        .from('academic_years')
        .select('id, base_score')
        .eq('is_current', true)
        .single();

      const baseScore = acYear?.base_score || 100;

      // Get score summary
      const { data: scores } = await supabase
        .from('score_transactions')
        .select('points, status, recorded_at, note, score_categories(name, type), profiles!score_transactions_recorded_by_fkey(full_name)')
        .eq('student_id', student.id)
        .eq('academic_year_id', acYear?.id)
        .eq('status', 'approved')
        .order('recorded_at', { ascending: false });

      if (scores) {
        const totalDeducted = scores.filter(t => t.points < 0).reduce((s, t) => s + Math.abs(t.points), 0);
        const totalAdded = scores.filter(t => t.points > 0).reduce((s, t) => s + t.points, 0);
        setSummary({ current_score: baseScore - totalDeducted + totalAdded, total_deducted: totalDeducted, total_added: totalAdded });
        setTransactions(scores);
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">คะแนนของฉัน</h1>
        <p className="text-muted-foreground mt-1">ดูคะแนนความประพฤติและประวัติ</p>
      </div>

      {studentInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{studentInfo.classrooms?.name || 'ไม่ระบุชั้นเรียน'}</CardTitle>
            <p className="text-sm text-muted-foreground">รหัสนักเรียน: {studentInfo.student_id_number}</p>
          </CardHeader>
        </Card>
      )}

      {summary && (
        <div className="grid gap-4 grid-cols-3">
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-3xl font-bold">{summary.current_score}</div>
            <div className="text-xs text-muted-foreground">คะแนนปัจจุบัน</div>
          </div>
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-3xl font-bold text-destructive">{summary.total_deducted}</div>
            <div className="text-xs text-muted-foreground">ถูกหัก</div>
          </div>
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-3xl font-bold text-green-600">+{summary.total_added}</div>
            <div className="text-xs text-muted-foreground">ได้เพิ่ม</div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ประวัติคะแนน</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">ยังไม่มีประวัติการบันทึกคะแนน</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>คะแนน</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                  <TableHead>บันทึกโดย</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{new Date(t.recorded_at).toLocaleDateString('th-TH')}</TableCell>
                    <TableCell>{t.score_categories?.name || '-'}</TableCell>
                    <TableCell>
                      <span className={t.points > 0 ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                        {t.points > 0 ? `+${t.points}` : t.points}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.note || '-'}</TableCell>
                    <TableCell className="text-xs">{t.profiles?.full_name || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

