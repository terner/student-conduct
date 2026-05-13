'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { School, LogIn, AlertCircle, UserIcon, Mail, ShieldCheck, GraduationCap, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loginEmailSchema, loginStudentSchema, type LoginEmailInput, type LoginStudentInput } from '@/lib/validation/schemas';
import { useTranslations } from 'next-intl';

type LoginFormProps = {
  schoolName: string;
  schoolLogo?: string;
};

type QuickUser = {
  label: string;
  labelKey?: 'superadminRole' | 'adminRole';
  email?: string;
  studentId?: string;
  password: string;
  icon: any;
};

const staffQuickUsers: QuickUser[] = [
  { label: 'superadmin', labelKey: 'superadminRole', email: 'admin@school.com', password: 'Admin123!', icon: ShieldCheck },
  { label: 'admin', labelKey: 'adminRole', email: 'admin.approval@school.com', password: 'Admin123!', icon: ShieldCheck },
  { label: 'นางสาวอรทัย ใจดี', email: 'teacher1@school.com', password: 'Teacher@123', icon: GraduationCap },
];

const studentQuickUsers: QuickUser[] = [
  { label: 'ธนภัทร ตั้งใจเรียน', studentId: '2569000001', password: 'Student@123', icon: UserRound },
  { label: 'มินตรา ตั้งใจเรียน', studentId: '2569000002', password: 'Student@123', icon: UserRound },
  { label: 'ปุณณวิช ตั้งใจเรียน', studentId: '2569000003', password: 'Student@123', icon: UserRound },
  { label: 'ณิชา ตั้งใจเรียน', studentId: '2569000004', password: 'Student@123', icon: UserRound },
];

async function quickLogin(body: Record<string, string>, fallbackError: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || fallbackError);
  if (result.must_change_password) {
    window.location.href = '/change-password';
    return;
  }
  const roles = Array.isArray(result.role) ? result.role : [result.role];
  if (roles.includes('student') && !roles.includes('admin') && !roles.includes('teacher') && !roles.includes('superadmin')) {
    // Redirect to self-profile page — the /students/me route will resolve
    // the logged-in user's student ID automatically.
    window.location.href = '/students/me';
  } else if (roles.includes('teacher') && !roles.includes('admin') && !roles.includes('superadmin')) {
    window.location.href = '/score/record';
  } else {
    window.location.href = '/dashboard';
  }
}

export function LoginForm({ schoolName, schoolLogo }: LoginFormProps) {
  const authT = useTranslations('auth');
  const commonT = useTranslations('common');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'staff' | 'student'>('staff');
  const getQuickUserLabel = (user: QuickUser) => user.labelKey ? authT(user.labelKey) : user.label;

  const emailForm = useForm<LoginEmailInput>({
    resolver: zodResolver(loginEmailSchema),
    defaultValues: { email: 'admin@school.com', password: 'Admin123!' },
  });

  const studentForm = useForm<LoginStudentInput>({
    resolver: zodResolver(loginStudentSchema),
    defaultValues: { student_id: '', password: '' },
  });

  async function onSubmitStaff(data: LoginEmailInput) {
    setLoading(true);
    setError('');
    try {
      await quickLogin({ email: data.email, password: data.password }, authT('loginFailed'));
    } catch (err: any) {
      setError(err.message || commonT('error'));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitStudent(data: LoginStudentInput) {
    setLoading(true);
    setError('');
    try {
      await quickLogin({ student_id: data.student_id, password: data.password }, authT('loginFailed'));
    } catch (err: any) {
      setError(err.message || commonT('error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(user: QuickUser) {
    setLoading(true);
    setError('');
    try {
      if (user.email) {
        await quickLogin({ email: user.email, password: user.password }, authT('loginFailed'));
      } else if (user.studentId) {
        await quickLogin({ student_id: user.studentId, password: user.password }, authT('loginFailed'));
      }
    } catch (err: any) {
      setError(err.message || commonT('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex size-16 items-center justify-center rounded-xl border bg-card shadow-sm">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                className="size-14 rounded-lg object-contain"
              />
            ) : (
              <School className="h-7 w-7 text-primary" />
            )}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl leading-snug">{schoolName || authT('loginTitle')}</CardTitle>
            <CardDescription>{authT('loginTitle')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMode} onValueChange={(v) => { setLoginMode(v as 'staff' | 'student'); setError(''); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="staff">
                <Mail className="h-4 w-4 mr-1" />
                {authT('staffLogin')}
              </TabsTrigger>
              <TabsTrigger value="student">
                <UserIcon className="h-4 w-4 mr-1" />
                {authT('studentLogin')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              {/* Quick login buttons */}
              <div className="space-y-2 mb-4">
                <p className="text-xs text-muted-foreground font-medium">{authT('quickLoginPrompt')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {staffQuickUsers.map((user) => {
                    const Icon = user.icon;
                    return (
                      <button
                        key={user.email}
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickLogin(user)}
                        className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center hover:bg-accent hover:border-primary/50 transition-all disabled:opacity-50"
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium leading-tight">{getQuickUserLabel(user)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">{authT('manualLoginDivider')}</span>
                </div>
              </div>

              <form onSubmit={emailForm.handleSubmit(onSubmitStaff)} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">{authT('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={authT('emailPlaceholder')}
                    {...emailForm.register('email')}
                    autoComplete="email"
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{authT('password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={authT('passwordPlaceholder')}
                    {...emailForm.register('password')}
                    autoComplete="current-password"
                  />
                  {emailForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{emailForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? authT('loggingIn') : authT('loginButton')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="student">
              {/* Quick login buttons */}
              <div className="space-y-2 mb-4">
                <p className="text-xs text-muted-foreground font-medium">{authT('quickLoginPrompt')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {studentQuickUsers.map((user) => {
                    const Icon = user.icon;
                    return (
                      <button
                        key={user.studentId}
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickLogin(user)}
                        className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center hover:bg-accent hover:border-primary/50 transition-all disabled:opacity-50"
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-xs font-medium leading-tight">{getQuickUserLabel(user)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">{authT('manualLoginDivider')}</span>
                </div>
              </div>

              <form onSubmit={studentForm.handleSubmit(onSubmitStudent)} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="student_id">{authT('studentIdLabel')}</Label>
                  <Input
                    id="student_id"
                    type="text"
                    placeholder={authT('studentIdPlaceholder')}
                    maxLength={10}
                    {...studentForm.register('student_id')}
                    autoComplete="username"
                  />
                  {studentForm.formState.errors.student_id && (
                    <p className="text-xs text-destructive">{studentForm.formState.errors.student_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student_password">{authT('password')}</Label>
                  <Input
                    id="student_password"
                    type="password"
                    placeholder={authT('passwordPlaceholder')}
                    {...studentForm.register('password')}
                    autoComplete="current-password"
                  />
                  {studentForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{studentForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? authT('loggingIn') : authT('loginButton')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
