'use client';

import { Spinner } from '@/components/ui/spinner';
import { useTranslations } from 'next-intl';

export default function Loading() {
  const commonT = useTranslations('common');

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">{commonT('loading')}</p>
      </div>
    </div>
  );
}
