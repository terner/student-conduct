'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  baseScore?: number;
  className?: string;
}

export function ScoreBadge({ score, baseScore = 100, className }: ScoreBadgeProps) {
  const t = useTranslations('level');
  const getLevel = () => {
    if (score >= baseScore) return { label: t('excellent'), color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300' };
    if (score >= baseScore - 20) return { label: t('good'), color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300' };
    if (score >= baseScore - 40) return { label: t('fair'), color: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300' };
    return { label: t('poor'), color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300' };
  };

  const level = getLevel();

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', level.color, className)}>
      {score} — {level.label}
    </span>
  );
}
