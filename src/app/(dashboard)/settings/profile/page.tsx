'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { getCurrentUserRole, changeProfileName } from '@/lib/actions/dashboard.action';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    full_name?: string;
    role?: string;
    email?: string | null;
  }>({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    async function load() {
      const res = await getCurrentUserRole();
      if (res.success && res.data) {
        setProfile(res.data as typeof profile);
        // Extract first/last name from full_name
        const parts = (res.data.full_name || '').split(' ');
        if (parts.length >= 2) {
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(' '));
        } else {
          setFirstName(res.data.full_name || '');
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSaveName = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast('กรุณากรอกชื่อและนามสกุล');
      return;
    }
    setSaving(true);
    try {
      const res = await changeProfileName(firstName.trim(), lastName.trim());
      if (res.success) {
        toast('บันทึกข้อมูลสำเร็จ');
      } else {
        toast('เกิดข้อผิดพลาด', { description: res.error?.message });
      }
    } catch {
      toast('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">โปรไฟล์ของฉัน</h1>
          <p className="text-muted-foreground mt-1">จัดการข้อมูลส่วนตัว</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserIcon className="size-5" />
              ข้อมูลส่วนตัว
            </CardTitle>
            <CardDescription>ชื่อที่แสดงในระบบ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>อีเมล</Label>
              <Input value={profile.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">อีเมลไม่สามารถเปลี่ยนได้ด้วยตนเอง</p>
            </div>
            <div className="space-y-2">
              <Label>บทบาท</Label>
              <Input value={profile.role || ''} disabled className="bg-muted capitalize" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ชื่อ *</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="ชื่อ" />
              </div>
              <div className="space-y-2">
                <Label>นามสกุล *</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="นามสกุล" />
              </div>
            </div>
            <Button onClick={handleSaveName} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="size-5" />
              รหัสผ่าน
            </CardTitle>
            <CardDescription>เปลี่ยนรหัสผ่านสำหรับเข้าใช้งาน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ไปที่หน้าเปลี่ยนรหัสผ่านเพื่อตั้งรหัสผ่านใหม่
            </p>
            <Button variant="outline" nativeButton={false} render={<Link href="/change-password" />}>
              <Lock className="mr-2 h-4 w-4" />
              เปลี่ยนรหัสผ่าน
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
