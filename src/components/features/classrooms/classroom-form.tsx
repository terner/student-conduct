'use client';

import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classroomSchema, type ClassroomInput } from '@/lib/validation/schemas';
import { getEducationStages } from '@/lib/actions/education-stage.action';
import { getGradeLevels, type GradeLevelItem } from '@/lib/actions/grade-level.action';
import { useTranslations } from 'next-intl';

interface ClassroomFormProps {
  defaultValues?: Partial<ClassroomInput>;
  onSubmit: (data: ClassroomInput) => Promise<void>;
  onCancel?: () => void;
}

type ClassroomFormValues = z.input<typeof classroomSchema>;

export function ClassroomForm({ defaultValues, onSubmit, onCancel }: ClassroomFormProps) {
  const classroomT = useTranslations('classroom');
  const commonT = useTranslations('common');
  const isEditing = !!defaultValues?.name;
  const [stages, setStages] = useState<{ id: string; name_th: string; code: string }[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevelItem[]>([]);
  const [loadingStages, setLoadingStages] = useState(true);

  const { control, register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ClassroomFormValues, unknown, ClassroomInput>({
    resolver: zodResolver(classroomSchema),
    defaultValues: defaultValues || { name: '', education_stage_id: '', grade_level_id: '', grade_level: 1, room_count: 1 },
  });

  const defaultEducationStageId = defaultValues?.education_stage_id;
  const selectedStageId = useWatch({ control, name: 'education_stage_id' });
  const selectedGradeLevelId = useWatch({ control, name: 'grade_level_id' });
  const selectedGradeLevel = gradeLevels.find(level => level.id === selectedGradeLevelId);
  const availableGradeLevels = gradeLevels.filter(level => level.education_stage_id === selectedStageId);
  const gradeLevel = useWatch({ control, name: 'grade_level' }) || 1;
  const roomCount = useWatch({ control, name: 'room_count' }) || 1;

  const generatedNames = Array.from({ length: Math.min(Number(roomCount) || 0, 20) }, (_, index) => {
    const label = selectedGradeLevel?.name || String(gradeLevel);
    return `${label}/${index + 1}`;
  });

  useEffect(() => {
    Promise.all([getEducationStages(), getGradeLevels()]).then(([stageRes, gradeRes]) => {
      if (stageRes.success && stageRes.data) {
        setStages(stageRes.data);
        // Set default stage if not set
        if (!defaultEducationStageId && stageRes.data.length > 0) {
          setValue('education_stage_id', stageRes.data[0].id);
        }
      }
      if (gradeRes.success && gradeRes.data) setGradeLevels(gradeRes.data);
      setLoadingStages(false);
    });
  }, [defaultEducationStageId, setValue]);

  useEffect(() => {
    if (!selectedStageId || gradeLevels.length === 0) return;
    const current = gradeLevels.find(level => level.id === selectedGradeLevelId);
    if (current?.education_stage_id === selectedStageId) return;
    const firstLevel = gradeLevels.find(level => level.education_stage_id === selectedStageId);
    setValue('grade_level_id', firstLevel?.id || '');
    setValue('grade_level', firstLevel?.level_no || 1);
  }, [selectedStageId, selectedGradeLevelId, gradeLevels, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isEditing && (
        <div className="space-y-2">
          <Label htmlFor="name">{classroomT('nameRequired')}</Label>
          <Input id="name" {...register('name')} placeholder={classroomT('namePlaceholder')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label>{classroomT('stageRequired')}</Label>
        {loadingStages ? (
          <div className="flex items-center gap-2 h-11 px-3 rounded-md border text-sm text-muted-foreground">
            <Spinner className="size-4" />
            {commonT('loading')}
          </div>
        ) : (
          <>
            <Select
              value={selectedStageId}
              onValueChange={(v) => {
                if (!v) return;
                setValue('education_stage_id', v);
                setValue('grade_level_id', '');
              }}
              itemToStringLabel={(value) => {
                const stage = stages.find(s => s.id === value);
                return stage ? stage.name_th : String(value);
              }}
            >
              <SelectTrigger><SelectValue placeholder={classroomT('selectStage')} /></SelectTrigger>
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
        <Label>{classroomT('gradeRequired')}</Label>
        <Select
          value={selectedGradeLevelId || ''}
          onValueChange={(v) => {
            if (!v) return;
            const level = gradeLevels.find(item => item.id === v);
            setValue('grade_level_id', v);
            setValue('grade_level', level?.level_no || 1);
          }}
          disabled={!selectedStageId || loadingStages}
          itemToStringLabel={(value) => {
            const level = gradeLevels.find(item => item.id === value);
            return level ? level.name : String(value);
          }}
        >
          <SelectTrigger><SelectValue placeholder={classroomT('selectGradeLevel')} /></SelectTrigger>
          <SelectContent>
            {availableGradeLevels.map(level => (
              <SelectItem key={level.id} value={level.id} label={level.name}>
                {level.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" {...register('grade_level', { valueAsNumber: true })} />
        {errors.grade_level && <p className="text-xs text-destructive">{errors.grade_level.message}</p>}
        {errors.grade_level_id && <p className="text-xs text-destructive">{errors.grade_level_id.message}</p>}
      </div>

      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="room_count">{classroomT('roomCountRequired')}</Label>
          <Input id="room_count" type="number" min={1} max={20} {...register('room_count', { valueAsNumber: true })} />
          {errors.room_count && <p className="text-xs text-destructive">{errors.room_count.message}</p>}
          {generatedNames.length > 0 && selectedGradeLevel && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {classroomT('willCreateLabel')} <span className="font-medium text-foreground">{generatedNames.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>{commonT('cancel')}</Button>}
        <Button type="submit" disabled={isSubmitting || loadingStages}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.name ? commonT('save') : classroomT('add')}
        </Button>
      </div>
    </form>
  );
}
