'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { acceptPDPA, getCurrentUserRole } from '@/lib/actions/dashboard.action';

export default function PdpaConsentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserRole().then((res) => {
      if (res.success && res.data) {
        setUserRole(res.data.role);
      } else {
        setError('ไม่สามารถตรวจสอบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบอีกครั้ง');
      }
    });
  }, []);

  async function handleAccept() {
    setLoading(true);
    setError('');
    try {
      const res = await acceptPDPA();
      if (res.success) {
        // Redirect based on role
        if (userRole === 'student') {
          window.location.href = '/student/dashboard';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(res.error?.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>นโยบายความเป็นส่วนตัว</CardTitle>
          <CardDescription>
            PDPA Consent — การยินยอมให้เก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <p>
            โรงเรียนจัดเก็บข้อมูลส่วนบุคคลของท่านเพื่อใช้ในการดำเนินการด้านการศึกษา
            การบันทึกคะแนนความประพฤติ และการติดต่อสื่อสารที่เกี่ยวข้อง
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ชื่อ-นามสกุล, รหัสนักเรียน/เจ้าหน้าที่, รูปถ่าย</li>
            <li>ข้อมูลคะแนนความประพฤติและประวัติการกระทำความผิด</li>
            <li>ข้อมูลการติดต่อ (เบอร์โทร, อีเมล, Line ID)</li>
            <li>ข้อมูลผู้ปกครองและผู้ติดต่อฉุกเฉิน</li>
          </ul>
          <p>
            ท่านสามารถยกเลิกความยินยอมได้ตลอดเวลา โดยแจ้งที่ฝ่ายบริหารของโรงเรียน
          </p>

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <span>
              ข้าพเจ้ายินยอมให้โรงเรียนเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล
              ตามวัตถุประสงค์ที่แจ้งข้างต้น
            </span>
          </label>
        </CardContent>
        <CardFooter className="flex gap-2 justify-end">
          <Button variant="outline" nativeButton={false} disabled={loading} render={<a href="/pdpa-rejected" />}>
            <X className="mr-2 h-4 w-4" />
            ไม่ยอมรับ
          </Button>
          <Button onClick={handleAccept} disabled={!accepted || loading}>
            <Check className="mr-2 h-4 w-4" />
            {loading ? 'กำลังบันทึก...' : 'ยอมรับ'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
