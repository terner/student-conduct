'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingDown, TrendingUp, Minus, Sparkles, Clock, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { getStudentDashboard } from '@/lib/actions/student.action';
import { checkMustChangePassword, checkPDPAConsent } from '@/lib/actions/dashboard.action';
import { useTranslations } from 'next-intl';

function formatDateShort(value: string) {
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/** SVG circular score gauge */
function ScoreGauge({ score, baseScore = 100, size = 160 }: { score: number; baseScore?: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, score / 200); // 200 as max visual (score can exceed 100)
  const offset = circumference * (1 - Math.min(ratio, 1));
  const center = size / 2;

  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : score >= 40 ? '#ea580c' : '#dc2626';

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-muted, #e5e7eb)" strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-3xl font-bold tracking-tight tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground">จาก {baseScore}</span>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const studentT = useTranslations('student');
  const commonT = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const passwordRes = await checkMustChangePassword();
      if (passwordRes.success && passwordRes.data?.must_change_password) {
        router.replace('/change-password');
        return;
      }
      const consentRes = await checkPDPAConsent();
      if (consentRes.success && consentRes.data && !consentRes.data.consented) {
        router.replace('/pdpa-consent');
        return;
      }
      const res = await getStudentDashboard();
      if (res.success && res.data) {
        setStudentInfo(res.data.student);
        setSummary(res.data.summary);
        setTransactions(res.data.transactions || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-10" />
          <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
        </div>
      </div>
    );
  }

  const score = summary?.current_score ?? 100;
  const deducted = summary?.total_deducted ?? 0;
  const added = summary?.total_added ?? 0;
  const hasScores = transactions.length > 0;

  // Build timeline entries grouped by date
  const timeline = transactions.reduce((acc: any[], t: any) => {
    const date = formatDateShort(t.recorded_at);
    const last = acc[acc.length - 1];
    if (last?.date === date) {
      last.items.push(t);
    } else {
      acc.push({ date, items: [t] });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* Welcome banner */}
      {studentInfo && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {studentInfo.avatar_url ? (
                <img src={studentInfo.avatar_url} alt="" className="size-16 rounded-full border-2 border-background object-cover shadow-sm" />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 border-2 border-background shadow-sm">
                  <span className="text-xl font-bold text-primary">
                    {(studentInfo.first_name || studentInfo.full_name || '?')[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">ยินดีต้อนรับ</p>
                <h1 className="text-xl font-bold tracking-tight">
                  {studentInfo.prefix || ''}{studentInfo.first_name || studentInfo.full_name || ''} {studentInfo.last_name || ''}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <span>{studentInfo.classroom_name || '—'}</span>
                  {studentInfo.class_number && <><span>·</span><span>เลขที่ {studentInfo.class_number}</span></>}
                  {studentInfo.education_stage_name && <><span>·</span><span>{studentInfo.education_stage_name}</span></>}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="self-start sm:self-center shrink-0">
              <Hash className="size-3 mr-1" />
              {studentInfo.student_id_number}
            </Badge>
          </div>
        </div>
      )}

      {/* Score overview */}
      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <Card className="md:w-[220px]">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-sm font-medium text-muted-foreground">{studentT('conductScore')}</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <div className="relative inline-flex">
              <ScoreGauge score={score} baseScore={summary?.base_score} size={150} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 content-start sm:grid-cols-2">
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingDown className="size-4 text-destructive" />
                {studentT('deducted')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive tabular-nums">{deducted}</p>
              <p className="text-xs text-muted-foreground mt-1">คะแนนที่ถูกหักทั้งหมด</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="size-4 text-green-500" />
                {studentT('added')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600 tabular-nums">+{added}</p>
              <p className="text-xs text-muted-foreground mt-1">คะแนนที่ได้เพิ่มทั้งหมด</p>
            </CardContent>
          </Card>
          {/* Guardian card */}
          <Card className="sm:col-span-2">
            <CardContent className="py-4">
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">{studentT('guardianName')}</p>
                  <p className="font-medium">{studentInfo?.guardian_full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{studentT('guardianRelation')}</p>
                  <p className="font-medium">
                    {studentInfo?.guardian_relation === 'father' ? 'บิดา'
                      : studentInfo?.guardian_relation === 'mother' ? 'มารดา'
                      : studentInfo?.guardian_relation || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{studentT('guardianPhoneShort')}</p>
                  <p className="font-medium">{studentInfo?.guardian_phone || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Teacher info */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 shrink-0">
                <span className="text-xs font-bold">คป</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ครูประจำชั้น</p>
                <p className="font-medium">{studentInfo?.homeroom_teacher_name || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-50 text-amber-600 shrink-0">
                <span className="text-xs font-bold">คป</span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ครูที่ปรึกษา</p>
                <p className="font-medium">{studentInfo?.advisor_teacher_name || '—'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score timeline */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {studentT('scoreHistory')}
            {hasScores && (
              <Badge variant="secondary" className="ml-2 font-normal tabular-nums">{transactions.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {!hasScores ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Sparkles className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{studentT('noScoreHistory')}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {timeline.map((group: any, gi: number) => (
                <div key={gi}>
                  {gi > 0 && <Separator className="my-3" />}
                  <p className="text-xs font-medium text-muted-foreground mb-2">{group.date}</p>
                  <div className="space-y-2">
                    {group.items.map((t: any, ti: number) => (
                      <div key={ti} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                        <div className={`mt-1 size-2 rounded-full shrink-0 ${t.points > 0 ? 'bg-green-500' : t.points < 0 ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{t.category_name || '—'}</span>
                            {t.category_type && (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${t.category_type === 'positive' ? 'text-green-600 border-green-200 bg-green-50' : 'text-red-600 border-red-200 bg-red-50'}`}>
                                {t.category_type === 'positive' ? studentT('added') : studentT('deducted')}
                              </Badge>
                            )}
                          </div>
                          {t.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.note}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">{formatTime(t.recorded_at)}</span>
                            {t.recorded_by_name && <span className="text-[10px] text-muted-foreground">โดย {t.recorded_by_name}</span>}
                          </div>
                        </div>
                        <span className={`shrink-0 text-sm font-semibold tabular-nums ${t.points > 0 ? 'text-green-600' : t.points < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {t.points > 0 ? `+${t.points}` : t.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
