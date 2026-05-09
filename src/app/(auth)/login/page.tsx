'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { School, LogIn, AlertCircle, UserIcon, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loginEmailSchema, loginStudentSchema, type LoginEmailInput, type LoginStudentInput } from '@/lib/validation/schemas';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'staff' | 'student'>('staff');

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        return;
      }

      // Handle must_change_password
      if (result.must_change_password) {
        window.location.href = '/change-password';
        return;
      }

      // Role-based redirect
      switch (result.role) {
        case 'student':
          window.location.href = '/student/dashboard';
          break;
        case 'admin':
        case 'teacher':
        default:
          window.location.href = '/dashboard';
          break;
      }
    } catch (err) {
      console.error('[Login] Caught error:', err);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitStudent(data: LoginStudentInput) {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: data.student_id, password: data.password }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        return;
      }

      // Handle must_change_password
      if (result.must_change_password) {
        window.location.href = '/change-password';
        return;
      }

      // Student always goes to student dashboard
      window.location.href = '/student/dashboard';
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
          <Tabs value={loginMode} onValueChange={(v) => { setLoginMode(v as 'staff' | 'student'); setError(''); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="staff">
                <Mail className="h-4 w-4 mr-1" />
                ครู/ผู้ดูแล
              </TabsTrigger>
              <TabsTrigger value="student">
                <UserIcon className="h-4 w-4 mr-1" />
                นักเรียน
              </TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              <form onSubmit={emailForm.handleSubmit(onSubmitStaff)} className="space-y-4">
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
                    {...emailForm.register('email')}
                    autoComplete="email"
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...emailForm.register('password')}
                    autoComplete="current-password"
                  />
                  {emailForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{emailForm.formState.errors.password.message}</p>
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
            </TabsContent>

            <TabsContent value="student">
              <form onSubmit={studentForm.handleSubmit(onSubmitStudent)} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="student_id">รหัสนักเรียน (10 หลัก)</Label>
                  <Input
                    id="student_id"
                    type="text"
                    placeholder="1234567890"
                    maxLength={10}
                    {...studentForm.register('student_id')}
                    autoComplete="username"
                  />
                  {studentForm.formState.errors.student_id && (
                    <p className="text-xs text-destructive">{studentForm.formState.errors.student_id.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student_password">รหัสผ่าน</Label>
                  <Input
                    id="student_password"
                    type="password"
                    placeholder="••••••••"
                    {...studentForm.register('password')}
                    autoComplete="current-password"
                  />
                  {studentForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{studentForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {loading ? 'กำลังเข้า...' : 'เข้าสู่ระบบ'}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  สำหรับนักเรียนเท่านั้น
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
