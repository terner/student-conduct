'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const commonT = useTranslations('common');
  const settingsT = useTranslations('settings');

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3 text-center max-w-md">
        <AlertTriangle className="size-10 text-destructive" />
        <h2 className="text-lg font-semibold">{commonT('error')}</h2>
        <p className="text-sm text-muted-foreground">{error.message || settingsT('tryAgain')}</p>
        <Button variant="outline" onClick={reset}>{commonT('retry')}</Button>
      </div>
    </div>
  );
}
