'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { scoreRecordSchema, type ScoreRecordInput } from '@/lib/validation/schemas';
import type { ScoreCategory } from '@/types';
import type { StudentWithProfile } from '@/lib/db/queries/student.queries';

interface ScoreRecordFormProps {
  students: { id: string; full_name: string; student_id_number: string; classroom_name: string }[];
  categories: ScoreCategory[];
  onSubmit: (data: ScoreRecordInput) => Promise<void>;
  loading?: boolean;
}

export function ScoreRecordForm({ students, categories, onSubmit, loading }: ScoreRecordFormProps) {
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ScoreCategory | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ScoreRecordInput>({
    resolver: zodResolver(scoreRecordSchema),
    defaultValues: { student_id: '', category_id: '', points: 0, note: '' },
  });

  const studentId = watch('student_id');
  const categoryId = watch('category_id');

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.includes(studentSearch) ||
      s.student_id_number.includes(studentSearch)
  );

  const deductCategories = categories.filter((c) => c.type === 'deduct');
  const addCategories = categories.filter((c) => c.type === 'add');

  const handleCategorySelect = (value: string | null) => {
    if (!value) return;
    setValue('category_id', value, { shouldValidate: true });
    const cat = categories.find((c) => c.id === value);
    setSelectedCategory(cat || null);
    if (cat) {
      setValue('points', Math.abs(cat.default_points), { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>นักเรียน *</Label>
        <Input
          placeholder="ค้นหาชื่อหรือรหัสนักเรียน..."
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
        />
        <div className="max-h-[200px] overflow-y-auto rounded-md border">
          {filteredStudents.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">ไม่พบนักเรียน</div>
          ) : (
            filteredStudents.slice(0, 20).map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-accent ${
                  studentId === s.id ? 'bg-accent font-medium' : ''
                }`}
              >
                <input
                  type="radio"
                  name="student_id"
                  value={s.id}
                  checked={studentId === s.id}
                  onChange={(e) => setValue('student_id', e.target.value, { shouldValidate: true })}
                  className="sr-only"
                />
                <span className="font-mono text-xs text-muted-foreground w-[120px]">{s.student_id_number}</span>
                <span className="flex-1">{s.full_name}</span>
                <span className="text-xs text-muted-foreground">{s.classroom_name}</span>
              </label>
            ))
          )}
        </div>
        {errors.student_id && <p className="text-xs text-destructive">{errors.student_id.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>ประเภทคะแนน *</Label>
        <Select value={categoryId} onValueChange={handleCategorySelect}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกประเภท" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2 text-xs font-medium text-muted-foreground">หักคะแนน</div>
            {deductCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.default_points})
              </SelectItem>
            ))}
            <div className="p-2 text-xs font-medium text-muted-foreground mt-2">เพิ่มคะแนน</div>
            {addCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} (+{Math.abs(c.default_points)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>คะแนน *</Label>
        <div className="flex items-center gap-2">
          {selectedCategory && (
            <span className="text-lg font-bold">
              {selectedCategory.type === 'deduct' ? <Minus className="inline h-4 w-4 text-destructive" /> : <Plus className="inline h-4 w-4 text-green-600" />}
            </span>
          )}
          <Input
            type="number"
            min={1}
            max={999}
            {...register('points', { valueAsNumber: true })}
            className="w-24"
          />
        </div>
        {errors.points && <p className="text-xs text-destructive">{errors.points.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">หมายเหตุ</Label>
        <Textarea
          id="note"
          {...register('note')}
          placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
          rows={2}
        />
        {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
        {isSubmitting || loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        บันทึกคะแนน
      </Button>
    </form>
  );
}
