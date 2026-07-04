'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, Search, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface StudentResult {
  id: string;
  student_id_number: string;
  full_name: string;
  classroom_name: string;
}

type GuardianRelation = 'father' | 'mother' | 'guardian' | 'relative';

export default function LineRegisterPage() {
  const t = useTranslations('lineRegister');
  const commonT = useTranslations('common');
  const guardianT = useTranslations('guardian');
  const [step, setStep] = useState<'search' | 'verify' | 'done'>('search');
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [relation, setRelation] = useState<GuardianRelation>('guardian');
  const [searching, setSearching] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [studentResult, setStudentResult] = useState<StudentResult | null>(null);
  const [error, setError] = useState('');

  // Initialize LIFF
  useEffect(() => {
    async function initLiff() {
      try {
        // Dynamic import to avoid SSR issues
        const liff = (await import('@line/liff')).default;
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          setError(t('liffIdMissing'));
          return;
        }
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const profile = await liff.getProfile();
        setLineUserId(profile.userId);
      } catch (err) {
        console.error('LIFF init error:', err);
        setError(t('connectError'));
      }
    }
    initLiff();
  }, []);

  async function handleSearch() {
    if (!studentIdNumber.trim()) {
      toast.error(t('studentIdRequired'));
      return;
    }
    setSearching(true);
    setError('');
    try {
      const res = await fetch('/api/line/search-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id_number: studentIdNumber.trim() }),
      });
      const data = await res.json();
      if (data.success && data.student) {
        setStudentResult(data.student);
        setStep('verify');
      } else {
        setError(data.error || t('studentNotFound'));
      }
    } catch {
      setError(commonT('unknownError'));
    } finally {
      setSearching(false);
    }
  }

  async function handleRegister() {
    if (!lineUserId || !studentResult) return;
    if (!guardianPhone.trim()) {
      toast.error(t('phoneRequired'));
      return;
    }
    setRegistering(true);
    setError('');
    try {
      const res = await fetch('/api/line/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_user_id: lineUserId,
          student_id: studentResult.id,
          phone: guardianPhone.trim(),
          relation,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('done');
        toast.success(t('registerSuccess'));
      } else {
        setError(data.error || t('registerFailed'));
      }
    } catch {
      setError(commonT('unknownError'));
    } finally {
      setRegistering(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!lineUserId && !error && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <p className="text-sm text-muted-foreground">{t('connecting')}</p>
            </div>
          )}

          {lineUserId && step === 'search' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">{t('studentIdLabel')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="studentId"
                    value={studentIdNumber}
                    onChange={(e) => setStudentIdNumber(e.target.value)}
                    placeholder={t('studentIdPlaceholder')}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {lineUserId && step === 'verify' && studentResult && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-green-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">{t('studentFound')}</span>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">{t('nameLabel')}:</span> {studentResult.full_name}</p>
                  <p><span className="text-muted-foreground">{t('classroomLabel')}:</span> {studentResult.classroom_name}</p>
                  <p><span className="text-muted-foreground">{t('studentIdLabel')}:</span> {studentResult.student_id_number}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('relation')}</Label>
                <Select value={relation} onValueChange={(value) => setRelation((value as GuardianRelation | null) ?? 'guardian')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">{guardianT('relationFather')}</SelectItem>
                    <SelectItem value="mother">{guardianT('relationMother')}</SelectItem>
                    <SelectItem value="guardian">{guardianT('relationGuardian')}</SelectItem>
                    <SelectItem value="relative">{guardianT('relationRelative')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{commonT('phone')}</Label>
                <Input
                  id="phone"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder={commonT('phone')}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setStep('search'); setStudentResult(null); }}>
                  {commonT('back')}
                </Button>
                <Button className="flex-1" onClick={handleRegister} disabled={registering}>
                  {registering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('register')}
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t('doneTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('doneDescription')}
                </p>
              </div>
              <Button variant="outline" onClick={() => window.close()}>
                {commonT('close')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
