'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { School, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

type LoginFormProps = {
  schoolName: string;
  schoolLogo?: string;
};

function createLoginSchema(identityRequired: string, passwordRequired: string) {
  return z.object({
    identity: z.string().min(1, identityRequired),
    password: z.string().min(1, passwordRequired),
  });
}

type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;

async function doLogin(body: Record<string, string>, fallbackError: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result: { error?: string; must_change_password?: boolean; role?: string | string[] } = await res.json();
  if (!res.ok) throw new Error(result.error || fallbackError);
  if (result.must_change_password) {
    window.location.href = '/first-password';
    return;
  }
  const roles = Array.isArray(result.role) ? result.role : [result.role];
  if (roles.includes('student') && !roles.includes('admin') && !roles.includes('teacher') && !roles.includes('superadmin')) {
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
  const loginSchema = createLoginSchema(authT('identityRequired'), authT('passwordRequired'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identity: '', password: '' },
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    setError('');
    try {
      const isEmail = data.identity.includes('@');
      const body: Record<string, string> = { password: data.password };
      if (isEmail) body.email = data.identity;
      else body.student_id = data.identity;
      await doLogin(body, authT('loginFailed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : commonT('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex size-16 items-center justify-center rounded-xl border bg-card shadow-sm">
            {schoolLogo ? (
              <Image
                src={schoolLogo}
                alt={schoolName}
                width={56}
                height={56}
                unoptimized
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identity">{authT('emailOrStudentId')}</Label>
              <Input
                id="identity"
                type="text"
                placeholder={authT('emailOrStudentIdPlaceholder')}
                {...form.register('identity')}
                autoComplete="username"
              />
              {form.formState.errors.identity && (
                <p className="text-xs text-destructive">{form.formState.errors.identity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{authT('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={authT('passwordPlaceholder')}
                  {...form.register('password')}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? authT('loggingIn') : authT('loginButton')}
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4">
              © {new Date().getFullYear()} devkub.com
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
