'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { studentSchema, type StudentInput } from '@/lib/validation/schemas';

interface StudentFormProps {
  defaultValues?: Partial<StudentInput>;
  classrooms: { id: string; name: string; grade_level: number; education_stage?: string }[];
  onSubmit: (data: StudentInput) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export function StudentForm({ defaultValues, classrooms, onSubmit, onCancel, loading }: StudentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: (defaultValues || {
      first_name: '',
      last_name: '',
      student_id_number: '',
      classroom_id: '',
      class_number: 1,
      current_status: 'active',
    }) as StudentInput,
  });

  const classroomId = watch('classroom_id');

  const selectedClassroom = classrooms.find(c => c.id === classroomId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">ชื่อ *</Label>
          <Input id="first_name" {...register('first_name')} placeholder="ชื่อจริง" />
          {errors.first_name && <p className="text-xs text-destructive">{errors.first_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">นามสกุล *</Label>
          <Input id="last_name" {...register('last_name')} placeholder="นามสกุล" />
          {errors.last_name && <p className="text-xs text-destructive">{errors.last_name.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="student_id_number">รหัสนักเรียน 10 หลัก *</Label>
        <Input id="student_id_number" {...register('student_id_number')} placeholder="เช่น 1234567890" maxLength={10} />
        {errors.student_id_number && <p className="text-xs text-destructive">{errors.student_id_number.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>ห้องเรียน *</Label>
        <Select
          value={classroomId}
          onValueChange={(v) => v && setValue('classroom_id', v, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="เลือกห้องเรียน" />
          </SelectTrigger>
          <SelectContent>
            {classrooms.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.classroom_id && <p className="text-xs text-destructive">{errors.classroom_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="class_number">เลขที่ *</Label>
          <Input
            id="class_number"
            type="number"
            min={1}
            max={50}
            {...register('class_number', { valueAsNumber: true })}
          />
          {errors.class_number && <p className="text-xs text-destructive">{errors.class_number.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>ชั้นปี</Label>
          <Input
            value={selectedClassroom?.grade_level ? `ป.${selectedClassroom.grade_level}` : 'เลือกห้องก่อน'}
            disabled
            className="bg-muted"
          />
        </div>
      </div>

      {defaultValues?.current_status && (
        <div className="space-y-2">
          <Label>สถานะ</Label>
          <Select
            value={watch('current_status')}
            onValueChange={(v) => v && setValue('current_status', v as StudentInput['current_status'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">กำลังศึกษา</SelectItem>
              <SelectItem value="inactive">ไม่ Active</SelectItem>
              <SelectItem value="transferred">ย้ายออก</SelectItem>
              <SelectItem value="graduated">จบการศึกษา</SelectItem>
              <SelectItem value="suspended">พักการเรียน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting || loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {defaultValues?.student_id_number ? 'บันทึก' : 'เพิ่มนักเรียน'}
        </Button>
      </div>
    </form>
  );
}
