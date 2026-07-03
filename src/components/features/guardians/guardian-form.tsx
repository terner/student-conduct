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

export function GuardianForm({ studentId, guardian, onSuccess, onCancel }: GuardianFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!guardian;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GuardianManageInput>({
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
          toast.success('แก้ไขผู้ปกครองสำเร็จ');
          onSuccess();
        } else {
          toast.error(result.error?.message || 'เกิดข้อผิดพลาด');
        }
      } else {
        const result = await createGuardian(studentId, data);
        if (result.success) {
          toast.success('เพิ่มผู้ปกครองสำเร็จ');
          onSuccess();
        } else {
          toast.error(result.error?.message || 'เกิดข้อผิดพลาด');
        }
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="prefix">คำนำหน้า</Label>
          <Select
            value={prefixValue || ''}
            onValueChange={(val) => setValue('prefix', val as GuardianManageInput['prefix'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือก" />
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
          <Label htmlFor="first_name">ชื่อ *</Label>
          <Input
            id="first_name"
            {...register('first_name')}
            placeholder="ชื่อ"
          />
          {errors.first_name && (
            <p className="text-sm text-destructive">{errors.first_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">นามสกุล *</Label>
          <Input
            id="last_name"
            {...register('last_name')}
            placeholder="นามสกุล"
          />
          {errors.last_name && (
            <p className="text-sm text-destructive">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relation">ความสัมพันธ์ *</Label>
        <Select
          value={relationValue || 'guardian'}
          onValueChange={(val) => setValue('relation', val as GuardianManageInput['relation'])}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกความสัมพันธ์" />
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
          <Label htmlFor="phone">เบอร์โทร</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="0xx-xxx-xxxx"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">อีเมล</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="example@email.com"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="occupation">อาชีพ</Label>
        <Input
          id="occupation"
          {...register('occupation')}
          placeholder="อาชีพ"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">ที่อยู่</Label>
        <Input
          id="address"
          {...register('address')}
          placeholder="ที่อยู่"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'กำลังบันทึก...' : isEdit ? 'บันทึก' : 'เพิ่ม'}
        </Button>
      </div>
    </form>
  );
}
