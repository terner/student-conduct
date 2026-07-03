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
import { EvidenceUploader, type EvidenceFile } from './evidence-uploader';
import { useTranslations } from 'next-intl';

interface ScoreRecordFormProps {
  students: { id: string; full_name: string; student_id_number: string; classroom_name: string }[];
  categories: ScoreCategory[];
  onSubmit: (data: ScoreRecordInput, evidenceFiles?: File[]) => Promise<void>;
  loading?: boolean;
}

export function ScoreRecordForm({ students, categories, onSubmit, loading }: ScoreRecordFormProps) {
  const scoreT = useTranslations('score');
  const studentT = useTranslations('student');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ScoreCategory | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [evidenceError, setEvidenceError] = useState('');

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
    setEvidenceError('');
    setValue('category_id', value, { shouldValidate: true });
    const cat = categories.find((c) => c.id === value);
    setSelectedCategory(cat || null);
    if (cat) {
      setValue('points', Math.abs(cat.default_points), { shouldValidate: true });
    }
  };

  const handleFormSubmit = (formData: ScoreRecordInput) => {
    if (selectedCategory?.requires_evidence && evidenceFiles.length === 0) {
      setEvidenceError(scoreT('evidenceRequiredOne'));
      return;
    }
    setEvidenceError('');
    const files = evidenceFiles.map(e => e.file);
    onSubmit(formData, files);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>{scoreT('studentRequired')}</Label>
        <Input
          placeholder={scoreT('searchStudentWithEllipsis')}
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
        />
        <div className="max-h-[200px] overflow-y-auto rounded-md border">
          {filteredStudents.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">{scoreT('noStudentsMatched')}</div>
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
        <Label>{scoreT('categoryRequired')}</Label>
        <Select value={categoryId} onValueChange={handleCategorySelect}
          itemToStringLabel={(value) => {
            const cat = categories.find(c => c.id === value);
            if (cat) return cat.type === 'deduct' ? `${cat.name} (${cat.default_points})` : `${cat.name} (+${Math.abs(cat.default_points)})`;
            return String(value);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={scoreT('selectCategory')} />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2 text-xs font-medium text-muted-foreground">{studentT('deductScore')}</div>
            {deductCategories.map((c) => (
              <SelectItem key={c.id} value={c.id} label={`${c.name} (${c.default_points})`}>
                {c.name} ({c.default_points})
              </SelectItem>
            ))}
            <div className="p-2 text-xs font-medium text-muted-foreground mt-2">{studentT('addScore')}</div>
            {addCategories.map((c) => (
              <SelectItem key={c.id} value={c.id} label={`${c.name} (+${Math.abs(c.default_points)})`}>
                {c.name} (+{Math.abs(c.default_points)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>{scoreT('pointsRequired')}</Label>
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
        <Label htmlFor="note">{studentT('note')}</Label>
        <Textarea
          id="note"
          {...register('note')}
          placeholder={studentT('notePlaceholder')}
          rows={2}
        />
        {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
      </div>

      {selectedCategory?.requires_evidence && (
        <div className="space-y-2">
          <Label>{scoreT('evidenceRequiredForCategory')}</Label>
          <EvidenceUploader files={evidenceFiles} onChange={setEvidenceFiles} />
          {evidenceError && <p className="text-xs text-destructive">{evidenceError}</p>}
        </div>
      )}

      {!selectedCategory?.requires_evidence && evidenceFiles.length > 0 && (
        <div className="space-y-2">
          <Label>{scoreT('evidenceOptional')}</Label>
          <EvidenceUploader files={evidenceFiles} onChange={setEvidenceFiles} />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
        {isSubmitting || loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {scoreT('recordTitle')}
      </Button>
    </form>
  );
}
