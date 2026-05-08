'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { teacherSchema, type TeacherInput } from '@/lib/validation/schemas';

interface TeacherFormProps {
  defaultValues?: Partial<TeacherInput>;
  onSubmit: (data: TeacherInput) => Promise<void>;
  onCancel?: () => void;
}

export function TeacherForm({ defaultValues, onSubmit, onCancel }: TeacherFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<TeacherInput>({
    resolver: zodResolver(teacherSchema),
    defaultValues: defaultValues || { first_name: '', last_name: '', email: '', employee_id: '', department: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">ชื่อ *</Label>
          <Input id="first_name" {...register('first_name')} />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">นามสกุล *</Label>
          <Input id="last_name" {...register('last_name')} />
          {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">อีเมล * (ใช้เป็นชื่อผู้ใช้)</Label>
        <Input id="email" type="email" {...register('email')} disabled={!!defaultValues?.email} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="employee_id">รหัสเจ้าหน้าที่ *</Label>
          <Input id="employee_id" {...register('employee_id')} />
          {errors.employee_id && <p className="text-xs text-destructive">{errors.employee_id.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">แผนก</Label>
          <Input id="department" {...register('department')} placeholder="เช่น ฝ่ายปกครอง" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>ยกเลิก</Button>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.email ? 'บันทึก' : 'เพิ่มครู'}
        </Button>
      </div>
    </form>
  );
}
