'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { ImageIcon, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <form onSubmit={handleSubmit((data) => onSubmit({ ...data, avatar_url: avatarUrl || undefined }))} className="space-y-4">
      <div className="space-y-2">
        <Label>{teacherT('profilePhoto')}</Label>
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <div className="relative">
              <img src={avatarUrl} alt={teacherT('profilePhoto')} className="size-16 rounded-full border object-cover" />
              <button
                type="button"
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                onClick={() => setAvatarUrl('')}
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border border-dashed text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          )}
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              {uploadingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              <span>{uploadingAvatar ? teacherT('uploadingPhoto') : teacherT('choosePhotoShort')}</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingAvatar}
              onChange={handleAvatarUpload}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {teacherT('photoHelp')}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{teacherT('fullNameRequired')}</Label>
        <div className="grid gap-2 sm:grid-cols-[110px_1fr_1fr]">
          <Select
            value={prefixValue}
            onValueChange={(v) => v && setValue('prefix', v as TeacherInput['prefix'])}
            itemToStringLabel={(value) => String(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={teacherT('prefix')} />
            </SelectTrigger>
            <SelectContent>
              {teacherPrefixEnum.map((prefix) => (
                <SelectItem key={prefix} value={prefix} label={prefix}>
                  {prefix}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Input id="first_name" {...register('first_name')} placeholder={studentT('firstName')} />
            {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <Input id="last_name" {...register('last_name')} placeholder={studentT('lastName')} />
            {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="position">{teacherT('position')}</Label>
          <Select
            value={positionValue}
            onValueChange={(v) => v && setValue('position', v)}
            itemToStringLabel={(value) => String(value)}
          >
            <SelectTrigger id="position" className="w-full">
              <SelectValue placeholder={teacherT('selectPosition')} />
            </SelectTrigger>
            <SelectContent>
              {positionOptions.map((position) => (
                <SelectItem key={position.id} value={position.name} label={position.name}>
                  {position.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">{teacherT('department')}</Label>
          <Input id="department" {...register('department')} placeholder={teacherT('departmentPlaceholder')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">{teacherT('emailLoginLabel')}</Label>
          <Input id="email" type="email" {...register('email')} disabled={!!defaultValues?.email} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{teacherT('phone')}</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            {...register('phone')}
            value={phoneValue}
            onChange={(event) => setValue('phone', normalizePhoneInput(event.target.value), { shouldValidate: true })}
            placeholder={teacherT('phonePlaceholder')}
          />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee_id">{teacherT('employeeId')}</Label>
          <Input id="employee_id" {...register('employee_id')} />
          {errors.employee_id && <p className="text-xs text-destructive">{errors.employee_id.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="space-y-0.5">
            <Label htmlFor="system_role" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {teacherT('systemRole')}
            </Label>
            <p className="text-xs text-muted-foreground">{teacherT('systemRoleDescription')}</p>
          </div>
          <Select
            value={systemRole}
            onValueChange={(v) => {
              setValue('system_role', v as TeacherInput['system_role']);
              setValue('is_admin', v !== 'teacher');
            }}
            itemToStringLabel={(value) => {
              const labels: Record<string, string> = {
                teacher: teacherT('teacher'),
                admin: teacherT('admin'),
                superadmin: teacherT('superadmin'),
              };
              return labels[String(value)] || String(value);
            }}
          >
            <SelectTrigger id="system_role" className="w-full">
              <SelectValue placeholder={teacherT('selectRole')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="teacher" label={teacherT('teacher')}>{teacherT('teacher')}</SelectItem>
              <SelectItem value="admin" label={teacherT('admin')}>{teacherT('admin')}</SelectItem>
              <SelectItem value="superadmin" label={teacherT('superadmin')}>{teacherT('superadmin')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>{commonT('cancel')}</Button>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.email ? commonT('save') : teacherT('add')}
        </Button>
      </div>
    </form>
  );
}
