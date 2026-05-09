'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classroomSchema, type ClassroomInput } from '@/lib/validation/schemas';
import { getEducationStages } from '@/lib/actions/education-stage.action';

interface ClassroomFormProps {
  defaultValues?: Partial<ClassroomInput>;
  onSubmit: (data: ClassroomInput) => Promise<void>;
  onCancel?: () => void;
}

export function ClassroomForm({ defaultValues, onSubmit, onCancel }: ClassroomFormProps) {
  const [stages, setStages] = useState<{ id: string; name_th: string; code: string }[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ClassroomInput>({
    resolver: zodResolver(classroomSchema),
    defaultValues: defaultValues || { name: '', education_stage_id: '', grade_level: 1, academic_year: '2568' },
  });

  useEffect(() => {
    getEducationStages().then(res => {
      if (res.success && res.data) {
        setStages(res.data);
        // Set default stage if not set
        if (!defaultValues?.education_stage_id && res.data.length > 0) {
          setValue('education_stage_id', res.data[0].id);
        }
      }
      setLoadingStages(false);
    });
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">ชื่อห้องเรียน *</Label>
        <Input id="name" {...register('name')} placeholder="เช่น ป.1/1, ม.1/1" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>ระดับ *</Label>
        {loadingStages ? (
          <div className="flex items-center gap-2 h-11 px-3 rounded-md border text-sm text-muted-foreground">
            <Spinner className="size-4" />
            กำลังโหลด...
          </div>
        ) : (
          <>
            <Select value={watch('education_stage_id')} onValueChange={(v) => v && setValue('education_stage_id', v)}>
              <SelectTrigger><SelectValue placeholder="เลือกระดับ" /></SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.id} value={s.id} label={s.name_th}>
                    {s.name_th} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.education_stage_id && <p className="text-xs text-destructive">{errors.education_stage_id.message}</p>}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="grade_level">ชั้นปี *</Label>
        <Input id="grade_level" type="number" min={1} max={12} {...register('grade_level', { valueAsNumber: true })} />
        {errors.grade_level && <p className="text-xs text-destructive">{errors.grade_level.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="academic_year">ปีการศึกษา *</Label>
        <Input id="academic_year" {...register('academic_year')} placeholder="เช่น 2568" />
        {errors.academic_year && <p className="text-xs text-destructive">{errors.academic_year.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>ยกเลิก</Button>}
        <Button type="submit" disabled={isSubmitting || loadingStages}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.name ? 'บันทึก' : 'เพิ่มห้องเรียน'}
        </Button>
      </div>
    </form>
  );
}
