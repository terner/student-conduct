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
import { displayRole } from '@/lib/security/roles';
import { useTranslations } from 'next-intl';

export default function ProfilePage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const authT = useTranslations('auth');
  const studentT = useTranslations('student');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    full_name?: string;
    role?: string | string[];
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
      toast(settingsT('profileNameRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await changeProfileName(firstName.trim(), lastName.trim());
      if (res.success) {
        toast(settingsT('profileSaveSuccess'));
      } else {
        toast(settingsT('genericError'), { description: res.error?.message });
      }
    } catch {
      toast(settingsT('genericError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
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
          <h1 className="text-2xl font-bold">{settingsT('myProfile')}</h1>
          <p className="text-muted-foreground mt-1">{settingsT('profileManageDescription')}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserIcon className="size-5" />
              {settingsT('personalInfo')}
            </CardTitle>
            <CardDescription>{settingsT('displayNameDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{authT('email')}</Label>
              <Input value={profile.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">{settingsT('emailCannotChange')}</p>
            </div>
            <div className="space-y-2">
              <Label>{settingsT('role')}</Label>
              <Input
                value={displayRole(profile.role)}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{settingsT('firstNameRequired')}</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={studentT('firstName')} />
              </div>
              <div className="space-y-2">
                <Label>{settingsT('lastNameRequired')}</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={studentT('lastName')} />
              </div>
            </div>
            <Button onClick={handleSaveName} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? commonT('saving') : commonT('save')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="size-5" />
              {settingsT('password')}
            </CardTitle>
            <CardDescription>{settingsT('passwordDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {settingsT('changePasswordHelp')}
            </p>
            <Button variant="outline" nativeButton={false} render={<Link href="/change-password" />}>
              <Lock className="mr-2 h-4 w-4" />
              {authT('changePassword')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
