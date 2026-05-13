'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { ImageIcon, Loader2, ShieldCheck, Upload, X, User, Briefcase, Mail, Phone, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { teacherPrefixEnum, teacherSchema, type TeacherInput } from '@/lib/validation/schemas';
import { getTeacherPositions, type TeacherPositionItem } from '@/lib/actions/teacher-position.action';
import { normalizePhoneInput } from '@/lib/phone';
import { useTranslations } from 'next-intl';

interface TeacherFormProps {
  defaultValues?: Partial<TeacherInput>;
  onSubmit: (data: TeacherInput) => Promise<void>;
  onCancel?: () => void;
}

export function TeacherForm({ defaultValues, onSubmit, onCancel }: TeacherFormProps) {
  const teacherT = useTranslations('teacher');
  const studentT = useTranslations('student');
  const commonT = useTranslations('common');
  const settingsT = useTranslations('settings');
  const [positions, setPositions] = useState<TeacherPositionItem[]>([]);
  const [avatarUrl, setAvatarUrl] = useState(defaultValues?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<z.input<typeof teacherSchema>, unknown, TeacherInput>({
    resolver: zodResolver(teacherSchema),
    defaultValues: defaultValues || {
      prefix: 'นาย',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employee_id: '',
      department: '',
      position: 'ครู',
      system_role: 'teacher',
    },
  });
  const prefixValue = watch('prefix') || 'นาย';
  const systemRole = watch('system_role') || (watch('is_admin') ? 'admin' : 'teacher');
  const positionValue = watch('position') || 'ครู';
  const phoneValue = watch('phone') || '';
  const positionOptions = useMemo(() => {
    if (!positionValue || positions.some((item) => item.name === positionValue)) return positions;
    return [{ id: 'current', name: positionValue, sort_order: 0, is_active: true }, ...positions];
  }, [positionValue, positions]);

  useEffect(() => {
    async function loadPositions() {
      const result = await getTeacherPositions();
      if (result.success && result.data) {
        setPositions(result.data);
      }
    }
    loadPositions();
  }, []);

  useEffect(() => {
    setAvatarUrl(defaultValues?.avatar_url || '');
  }, [defaultValues?.avatar_url]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(settingsT('logoFileTooLarge'));
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('owner_id', defaultValues?.employee_id || `teacher-${Date.now()}`);
      formData.append('owner_type', 'teacher');
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: formData });
      const result = await res.json();
      if (res.ok && result.url) {
        setAvatarUrl(result.url);
      } else {
        alert(result.error || teacherT('uploadFailed'));
      }
    } catch {
      alert(teacherT('uploadError'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => onSubmit({ ...data, avatar_url: avatarUrl || undefined }))} className="space-y-6">
      {/* Avatar — centered */}
      <div className="flex flex-col items-center gap-3">
        {avatarUrl ? (
          <div className="relative">
            <img src={avatarUrl} alt="" className="size-20 rounded-full border-2 border-border object-cover shadow-sm" />
            <button
              type="button"
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
              onClick={() => setAvatarUrl('')}
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <div className="flex size-20 items-center justify-center rounded-full border-2 border-dashed bg-muted/30 text-muted-foreground">
            <ImageIcon className="size-8" />
          </div>
        )}
        <label className="cursor-pointer">
          <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {uploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            <span>{uploadingAvatar ? teacherT('uploadingPhoto') : teacherT('choosePhotoShort')}</span>
          </div>
          <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar} onChange={handleAvatarUpload} />
        </label>
        <p className="text-xs text-muted-foreground">{teacherT('photoHelp')}</p>
      </div>

      <Separator />

      {/* ชื่อ-นามสกุล */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{teacherT('fullNameRequired')}</Label>
        <div className="grid gap-2 sm:grid-cols-[100px_1fr_1fr]">
          <Select
            value={prefixValue}
            onValueChange={(v) => v && setValue('prefix', v as TeacherInput['prefix'])}
            itemToStringLabel={(value) => String(value)}
          >
            <SelectTrigger className="w-full !h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teacherPrefixEnum.map((prefix) => (
                <SelectItem key={prefix} value={prefix} label={prefix}>{prefix}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Input {...register('first_name')} placeholder={studentT('firstName')} className="h-10" />
            {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <Input {...register('last_name')} placeholder={studentT('lastName')} className="h-10" />
            {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
          </div>
        </div>
      </div>

      {/* ตำแหน่ง + แผนก */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-sm">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
            {teacherT('position')}
          </Label>
          <Select
            value={positionValue}
            onValueChange={(v) => v && setValue('position', v)}
            itemToStringLabel={(value) => String(value)}
          >
            <SelectTrigger className="!h-10 w-full">
              <SelectValue placeholder={teacherT('selectPosition')} />
            </SelectTrigger>
            <SelectContent>
              {positionOptions.map((p) => (
                <SelectItem key={p.id} value={p.name} label={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="department" className="text-sm">{teacherT('department')}</Label>
          <Input id="department" {...register('department')} placeholder={teacherT('departmentPlaceholder')} className="h-10" />
        </div>
      </div>

      {/* อีเมล + เบอร์โทร */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {teacherT('emailLoginLabel')}
          </Label>
          <Input id="email" type="email" {...register('email')} disabled={!!defaultValues?.email} className="h-10" />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            {teacherT('phone')}
          </Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            {...register('phone')}
            value={phoneValue}
            onChange={(event) => setValue('phone', normalizePhoneInput(event.target.value), { shouldValidate: true })}
            placeholder={teacherT('phonePlaceholder')}
            className="h-10"
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      {/* รหัสเจ้าหน้าที่ */}
      <div className="space-y-2">
        <Label htmlFor="employee_id" className="flex items-center gap-1.5 text-sm">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          {teacherT('employeeId')}
        </Label>
        <Input id="employee_id" {...register('employee_id')} className="h-10" />
        {errors.employee_id && <p className="text-xs text-destructive">{errors.employee_id.message}</p>}
      </div>

      <Separator />

      {/* สิทธิ์ในระบบ */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          {teacherT('systemRole')}
        </Label>
        <p className="text-xs text-muted-foreground">{teacherT('systemRoleDescription')}</p>
        <Select
          value={systemRole}
          onValueChange={(v) => {
            setValue('system_role', v as TeacherInput['system_role']);
            setValue('is_admin', v !== 'teacher');
          }}
          itemToStringLabel={(value) => {
            const labels: Record<string, string> = { teacher: teacherT('teacher'), admin: teacherT('admin'), superadmin: teacherT('superadmin') };
            return labels[String(value)] || String(value);
          }}
        >
          <SelectTrigger className="!h-10 w-full">
            <SelectValue placeholder={teacherT('selectRole')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="teacher" label={teacherT('teacher')}>
              <div className="flex flex-col">
                <span>{teacherT('teacher')}</span>
                <span className="text-xs text-muted-foreground">บันทึกคะแนน</span>
              </div>
            </SelectItem>
            <SelectItem value="admin" label={teacherT('admin')}>
              <div className="flex flex-col">
                <span>{teacherT('admin')}</span>
                <span className="text-xs text-muted-foreground">อนุมัติคะแนน, นำเข้าข้อมูล</span>
              </div>
            </SelectItem>
            <SelectItem value="superadmin" label={teacherT('superadmin')}>
              <div className="flex flex-col">
                <span>{teacherT('superadmin')}</span>
                <span className="text-xs text-muted-foreground">ตั้งค่าระบบ, จัดการทุกอย่าง</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting} className="h-11 text-base w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.email ? commonT('save') : teacherT('add')}
        </Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} className="h-11 text-base w-full">{commonT('cancel')}</Button>}
      </div>
    </form>
  );
}
