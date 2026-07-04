'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Lock, User as UserIcon, ImageIcon, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { getCurrentUserRole, changeProfileName } from '@/lib/actions/dashboard.action';
import Link from 'next/link';
import { hasAnyRole } from '@/lib/security/roles';
import { useTranslations } from 'next-intl';
import { getMyTeacherProfile, updateMyTeacherProfile } from '@/lib/actions/teacher.action';
import type { TeacherWithProfile } from '@/lib/db/queries/teacher.queries';
import { normalizePhoneInput } from '@/lib/phone';

export default function ProfilePage() {
  const settingsT = useTranslations('settings');
  const commonT = useTranslations('common');
  const authT = useTranslations('auth');
  const studentT = useTranslations('student');
  const teacherT = useTranslations('teacher');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<{
    full_name?: string;
    role?: string | string[];
    email?: string | null;
  }>({});
  const [teacherProfile, setTeacherProfile] = useState<TeacherWithProfile | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const profileRoles = Array.isArray(profile.role) ? profile.role : profile.role ? [profile.role] : [];
  const roleLabelByCode: Record<string, string> = {
    superadmin: teacherT('superadminRole'),
    admin: teacherT('adminRole'),
    teacher: teacherT('teacherRole'),
    student: teacherT('studentRole'),
  };
  const profileRoleLabel = profileRoles.map((roleCode) => roleLabelByCode[roleCode]).filter(Boolean).join(', ');
  const canUploadAvatar = hasAnyRole(profile, ['admin', 'superadmin']);

  useEffect(() => {
    async function load() {
      const [res, teacherRes] = await Promise.all([
        getCurrentUserRole(),
        getMyTeacherProfile(),
      ]);
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
      if (teacherRes.success && teacherRes.data) {
        const teacher = teacherRes.data as TeacherWithProfile;
        setTeacherProfile(teacher);
        setFirstName(teacher.first_name || '');
        setLastName(teacher.last_name || '');
        setPhone(teacher.phone || '');
        setDepartment(teacher.department || '');
        setPosition(teacher.position || '');
        setAvatarUrl(teacher.avatar_url || '');
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast(settingsT('profileNameRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = teacherProfile
        ? await updateMyTeacherProfile({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          department: department.trim(),
          position: position.trim(),
          avatar_url: avatarUrl,
        })
        : await changeProfileName(firstName.trim(), lastName.trim());
      if (res.success) {
        if (teacherProfile && res.data) setTeacherProfile(res.data as TeacherWithProfile);
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !teacherProfile || !canUploadAvatar) return;
    if (file.size > 2 * 1024 * 1024) {
      toast(settingsT('logoFileTooLarge'));
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner_id', teacherProfile.profile_id);
      formData.append('owner_type', 'teacher');
      const uploadRes = await fetch('/api/upload/avatar', { method: 'POST', body: formData });
      const upload = await uploadRes.json();
      if (!uploadRes.ok || !upload.url) {
        if (upload.error) {
          toast(upload.error);
        } else {
          toast(teacherT('uploadFailed'));
        }
        return;
      }

      setAvatarUrl(upload.url);
      const saveRes = await updateMyTeacherProfile({ avatar_url: upload.url });
      if (saveRes.success) {
        setTeacherProfile(saveRes.data as TeacherWithProfile);
        toast(settingsT('profileSaveSuccess'));
      } else {
        toast(settingsT('genericError'), { description: saveRes.error?.message });
      }
    } catch {
      toast(teacherT('uploadError'));
    } finally {
      setUploadingAvatar(false);
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
            {teacherProfile && (
              <div className="flex items-center gap-4 rounded-lg border p-4">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={teacherT('profilePhoto')} width={80} height={80} unoptimized className="size-20 rounded-full border object-cover" />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-full border border-dashed text-muted-foreground">
                    <ImageIcon className="size-7" />
                  </div>
                )}
                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="text-sm font-medium">{teacherT('profilePhoto')}</p>
                    <p className="text-xs text-muted-foreground">{teacherT('photoHelp')}</p>
                  </div>
                  {canUploadAvatar && (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary hover:text-primary/80">
                      {uploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      <span>{uploadingAvatar ? teacherT('uploadingPhoto') : teacherT('choosePhotoShort')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAvatar}
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>{authT('email')}</Label>
              <Input value={profile.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">{settingsT('emailCannotChange')}</p>
            </div>
            <div className="space-y-2">
              <Label>{settingsT('role')}</Label>
              <Input
                value={profileRoleLabel}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{settingsT('firstNameRequired')}</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={studentT('firstName')} />
              </div>
              <div className="space-y-2">
                <Label>{settingsT('lastNameRequired')}</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={studentT('lastName')} />
              </div>
            </div>
            {teacherProfile && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{teacherT('employeeId')}</Label>
                    <Input value={teacherProfile.employee_id || ''} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>{teacherT('position')}</Label>
                    <Input value={position} onChange={e => setPosition(e.target.value)} placeholder={teacherT('position')} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{teacherT('phone')}</Label>
                    <Input
                      value={phone}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={e => setPhone(normalizePhoneInput(e.target.value))}
                      placeholder={teacherT('phonePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{teacherT('department')}</Label>
                    <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder={teacherT('departmentPlaceholder')} />
                  </div>
                </div>
              </>
            )}
            <Button onClick={handleSaveProfile} disabled={saving}>
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
