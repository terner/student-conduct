'use client';

import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { scoreCategorySchema } from '@/lib/validation/schemas';

interface ScoreCategoryFormProps {
  defaultValues?: {
    id?: string;
    name: string;
    type: 'deduct' | 'add';
    default_points: number;
    description?: string;
    requires_evidence?: boolean;
    requires_approval?: boolean;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export function ScoreCategoryForm({ defaultValues, onSubmit, onCancel }: ScoreCategoryFormProps) {
  const t = useTranslations('score');
  const commonT = useTranslations('common');
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(scoreCategorySchema),
    defaultValues: defaultValues || {
      name: '',
      type: 'deduct' as const,
      default_points: 5,
      description: '',
      requires_evidence: false,
      requires_approval: false,
    },
  });

  const type = watch('type');
  const requiresEvidence = watch('requires_evidence');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('categoryName')} *</Label>
        <Input id="name" {...register('name')} placeholder={t('categoryNamePlaceholder')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>{t('type')} *</Label>
        <Select
          value={type}
          onValueChange={(v) => v && setValue('type', v as 'deduct' | 'add')}
          itemToStringLabel={(value) => value === 'deduct' ? t('deductType') : value === 'add' ? t('addType') : String(value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deduct" label={t('deductType')}>{t('deductType')}</SelectItem>
            <SelectItem value="add" label={t('addType')}>{t('addType')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="default_points">{t('defaultPoints')} *</Label>
        <Input
          id="default_points"
          type="number"
          {...register('default_points', { valueAsNumber: true })}
        />
        {errors.default_points && <p className="text-xs text-destructive">{errors.default_points.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('description')}</Label>
        <Textarea id="description" {...register('description')} placeholder={t('descriptionPlaceholder')} rows={2} />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="requires_evidence"
          checked={requiresEvidence}
          onCheckedChange={(v) => setValue('requires_evidence', v)}
        />
        <Label htmlFor="requires_evidence">{t('requiresEvidenceFull')}</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="requires_approval"
          checked={watch('requires_approval')}
          onCheckedChange={(v) => setValue('requires_approval', v)}
        />
        <Label htmlFor="requires_approval">{t('requiresApproval')}</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>{commonT('cancel')}</Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues?.id ? commonT('save') : t('addButton')}
        </Button>
      </div>
    </form>
  );
}
