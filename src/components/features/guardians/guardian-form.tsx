'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { guardianManageSchema, type GuardianManageInput } from '@/lib/validation/schemas';
import { createGuardian, updateGuardian } from '@/lib/actions/guardian.action';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

interface GuardianFormProps {
  studentId: string;
  guardian?: {
    guardian_id: string;
    prefix: string;
    first_name: string;
    last_name: string;
    relation: string;
    phone: string;
    email: string;
    address: string;
    occupation: string;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const RELATION_OPTIONS = [
  { value: 'father', label: 'บิดา' },
  { value: 'mother', label: 'มารดา' },
  { value: 'guardian', label: 'ผู้ปกครอง' },
  { value: 'relative', label: 'ญาติ' },
  { value: 'other', label: 'อื่นๆ' },
];

const PREFIX_OPTIONS = [
  { value: 'นาย', label: 'นาย' },
  { value: 'นาง', label: 'นาง' },
  { value: 'นางสาว', label: 'นางสาว' },
  { value: 'คุณ', label: 'คุณ' },
];

type GuardianManageFormInput = z.input<typeof guardianManageSchema>;

export function GuardianForm({ studentId, guardian, onSuccess, onCancel }: GuardianFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!guardian;
  const guardianT = useTranslations('guardian');
  const commonT = useTranslations('common');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GuardianManageFormInput, undefined, GuardianManageInput>({
    resolver: zodResolver(guardianManageSchema),
    defaultValues: {
      prefix: (guardian?.prefix as GuardianManageInput['prefix']) || '',
      first_name: guardian?.first_name || '',
      last_name: guardian?.last_name || '',
      relation: (guardian?.relation as GuardianManageInput['relation']) || 'guardian',
      phone: guardian?.phone || '',
      email: guardian?.email || '',
      address: guardian?.address || '',
      occupation: guardian?.occupation || '',
    },
  });

  const prefixValue = watch('prefix');
  const relationValue = watch('relation');

  async function onSubmit(data: GuardianManageInput) {
    setSubmitting(true);
    try {
      if (isEdit && guardian) {
        const result = await updateGuardian(guardian.guardian_id, data);
        if (result.success) {
          toast.success(guardianT('editSuccess'));
          onSuccess();
        } else {
          toast.error(result.error?.message ?? commonT('unknownError'));
        }
      } else {
        const result = await createGuardian(studentId, data);
        if (result.success) {
          toast.success(guardianT('addSuccess'));
          onSuccess();
        } else {
          toast.error(result.error?.message ?? commonT('unknownError'));
        }
      }
    } catch {
      toast.error(commonT('unknownError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="prefix">{guardianT('prefix')}</Label>
          <Select
            value={prefixValue || ''}
            onValueChange={(val) => setValue('prefix', val as GuardianManageInput['prefix'])}
          >
            <SelectTrigger>
              <SelectValue placeholder={guardianT('prefix')} />
            </SelectTrigger>
            <SelectContent>
              {PREFIX_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="first_name">{guardianT('firstName')} *</Label>
          <Input
            id="first_name"
            {...register('first_name')}
            placeholder={guardianT('firstName')}
          />
          {errors.first_name && (
            <p className="text-sm text-destructive">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">{guardianT('lastName')} *</Label>
          <Input
            id="last_name"
            {...register('last_name')}
            placeholder={guardianT('lastName')}
          />
          {errors.last_name && (
            <p className="text-sm text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relation">{guardianT('relationship')} *</Label>
        <Select
          value={relationValue || 'guardian'}
          onValueChange={(val) => setValue('relation', val as GuardianManageInput['relation'])}
        >
          <SelectTrigger>
            <SelectValue placeholder={guardianT('relationship')} />
          </SelectTrigger>
          <SelectContent>
            {RELATION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.relation && (
          <p className="text-sm text-destructive">{errors.relation.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="phone">{guardianT('phone')}</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder={commonT('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{guardianT('email')}</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="name@example.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="occupation">{guardianT('occupation')}</Label>
        <Input
          id="occupation"
          {...register('occupation')}
          placeholder={guardianT('occupation')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{guardianT('address')}</Label>
        <Input
          id="address"
          {...register('address')}
          placeholder={guardianT('address')}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {commonT('cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? commonT('saving') : isEdit ? commonT('save') : guardianT('add')}
        </Button>
      </div>
    </form>
  );
}
