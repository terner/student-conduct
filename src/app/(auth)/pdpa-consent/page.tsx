'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function PdpaConsentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        await supabase.from('pdpa_consents').insert({
          subject_type: profile.role === 'student' ? 'student' : profile.role === 'teacher' ? 'teacher' : 'admin',
          subject_id: profile.id,
          consent_type: 'general',
          version: '1.0',
          accepted: true,
          accepted_by: profile.id,
        });
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      // handled silently
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
