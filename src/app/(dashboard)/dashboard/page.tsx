'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, BookOpen, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ScoreBadge } from '@/components/features/scores/score-badge';
import { getDashboard, checkPDPAConsent, checkMustChangePassword } from '@/lib/actions/dashboard.action';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Check must_change_password first
      const passwordRes = await checkMustChangePassword();
      if (passwordRes.success && passwordRes.data?.must_change_password) {
        router.replace('/change-password');
        return;
      }

      // Check PDPA consent
      const consentRes = await checkPDPAConsent();
      if (consentRes.success && consentRes.data && !consentRes.data.consented) {
        router.replace('/pdpa-consent');
        return;
      }

      // Single consolidated call
      const res = await getDashboard();
      if (res.success) {
        setStats(res.data.stats);
        setRecentTx(res.data.recentTransactions || []);
        setAtRisk(res.data.atRiskStudents?.slice(0, 5) || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><div className="flex flex-col items-center gap-2"><Spinner className="size-8" /><p className="text-sm text-muted-foreground">กำลังโหลด...</p></div></div>;

  const statCards = [
    { title: 'นักเรียนทั้งหมด', value: stats?.total_students || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
    { title: 'กำลังศึกษา', value: stats?.active_students || 0, icon: Users, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900' },
    { title: 'ห้องเรียน', value: stats?.total_classrooms || 0, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900' },
    { title: 'ครู', value: stats?.total_teachers || 0, icon: BookOpen, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900' },
    { title: 'คะแนนเฉลี่ย', value: stats?.average_score || 0, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900' },
    { title: 'ถึงเกณฑ์แจ้งเตือน', value: stats?.at_risk_count || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' },
  ];

  const dist = stats?.score_distribution || { excellent: 0, good: 0, fair: 0, poor: 0 };
  const total = dist.excellent + dist.good + dist.fair + dist.poor;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
        <p className="text-muted-foreground mt-1">ภาพรวมระบบคะแนนความประพฤตินักเรียน</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${s.bg}`}>
                    <Icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.title}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">การกระจายระดับคะแนน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'ดีเยี่ยม (100+)', count: dist.excellent, color: 'bg-green-500' },
                { label: 'ดี (80-99)', count: dist.good, color: 'bg-blue-500' },
                { label: 'พอใช้ (60-79)', count: dist.fair, color: 'bg-yellow-500' },
                { label: 'ควรปรับปรุง (<60)', count: dist.poor, color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.count} คน ({total > 0 ? Math.round(item.count / total * 100) : 0}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.color}`}
                      style={{ width: `${total > 0 ? (item.count / total * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">รายการล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTx.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีรายการบันทึกคะแนน</p>
            ) : (
              <div className="space-y-2">
                {recentTx.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      {tx.points > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className="text-xs text-muted-foreground">{tx.student_id_number}</span>
                      <span className="font-medium">{tx.category_name}</span>
                    </div>
                    <span className={`font-mono text-xs font-medium ${tx.points > 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {tx.points > 0 ? `+${tx.points}` : tx.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {atRisk.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              นักเรียนที่ถึงเกณฑ์แจ้งเตือน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atRisk.map((s: any) => (
                <div key={s.student_id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <span className="font-medium text-sm">{s.first_name} {s.last_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({s.student_id_number})</span>
                    <span className="text-xs text-muted-foreground ml-2">{s.classroom_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={s.current_score} />
                    <span className="text-xs text-muted-foreground">หัด {s.deducted_total} คะแนน</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

