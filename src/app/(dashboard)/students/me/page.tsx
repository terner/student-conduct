'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Spinner } from '@/components/ui/spinner';

/**
 * /students/me — Resolves the logged-in user's student record and
 * redirects to their own student detail page.
 */
export default function StudentMePage() {
  const router = useRouter();
  const t = useTranslations('studentSelf');
  const common = useTranslations('common');
  const [error, setError] = useState('');

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch('/api/auth/me/student');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || t('notFound'));
          return;
        }
        const data = await res.json();
        if (data.id) {
          router.replace(`/students/${data.id}`);
        } else {
          setError(t('notFound'));
        }
      } catch {
        setError(common('error'));
      }
    }
    resolve();
  }, [common, router, t]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">{common('loading')}</p>
      </div>
    </div>
  );
}
