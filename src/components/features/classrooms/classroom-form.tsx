'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classroomSchema, type ClassroomInput } from '@/lib/validation/schemas';

interface ClassroomFormProps {
  defaultValues?: Partial<ClassroomInput>;
  onSubmit: (data: ClassroomInput) => Promise<void>;
  onCancel?: () => void;
}

export function ClassroomForm({ defaultValues, onSubmit, onCancel }: ClassroomFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ClassroomInput>({
    resolver: zodResolver(classroomSchema),
    defaultValues: defaultValues || { name: '', education_stage: 'primary', grade_level: 1, academic_year: '2568' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">ชื่อห้องเรียน *</Label>
        <Input id="name" {...register('name')} placeholder="เช่น ป.1/1, ม.1/1" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>ระดับ *</Label>
        <Select value={watch('education_stage')} onValueChange={(v) => v && setValue('education_stage', v as 'primary' | 'secondary')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">ประถมศึกษา</SelectItem>
            <SelectItem value="secondary">มัธยมศึกษา</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="grade_level">ชั้นปี *</Label>
        <Input id="grade_level" type="number" min={1} max={6} {...register('grade_level', { valueAsNumber: true })} />
        {errors.grade_level && <p className="text-xs text-destructive">{errors.grade_level.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="academic_year">ปีการศึกษา *</Label>
        <Input id="academic_year" {...register('academic_year')} placeholder="เช่น 2568" />
        {errors.academic_year && <p className="text-xs text-destructive">{errors.academic_year.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>ยกเลิก</Button>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.name ? 'บันทึก' : 'เพิ่มห้องเรียน'}
        </Button>
      </div>
    </form>
  );
}
