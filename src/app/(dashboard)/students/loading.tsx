import { getTranslations } from 'next-intl/server';
import { Spinner } from '@/components/ui/spinner';

export default async function Loading() {
  const t = await getTranslations('common');

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    </div>
  );
}
