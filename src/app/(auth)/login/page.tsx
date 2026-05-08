'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { School, LogIn, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loginEmailSchema, type LoginEmailInput } from '@/lib/validation/schemas';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginEmailInput>({
    resolver: zodResolver(loginEmailSchema),
    defaultValues: { email: 'admin@school.com', password: 'Admin123!' },
  });

  async function onSubmit(data: LoginEmailInput) {
    setLoading(true);
    setError('');

    try {
      console.log('[Login] Calling API route...', { email: data.email });

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error('[Login] API error:', result);
        setError(result.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        return;
      }

      console.log('[Login] Success! Redirecting...');
      // Full page redirect so cookies are sent with the request
      window.location.href = '/';
    } catch (err) {
      console.error('[Login] Caught error:', err);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <School className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">ระบบคะแนนความประพฤตินักเรียน</CardTitle>
          <CardDescription>เข้าสู่ระบบเพื่อจัดการข้อมูล</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@school.com"
                {...register('email')}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? 'กำลังเข้า...' : 'เข้าสู่ระบบ'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              สำหรับครู/ผู้ดูแลระบบเท่านั้น
            </p>
            <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              <p className="text-center font-medium">ทดสอบระบบ</p>
              <p className="text-center">admin@school.com / Admin123!</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
