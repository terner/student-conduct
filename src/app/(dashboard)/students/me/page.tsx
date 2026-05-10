'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

/**
 * /students/me — Resolves the logged-in user's student record and
 * redirects to their own student detail page.
 */
export default function StudentMePage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function resolve() {
      try {
        const res = await fetch('/api/auth/me/student');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'ไม่พบข้อมูลนักเรียน');
          return;
        }
        const data = await res.json();
        if (data.id) {
          router.replace(`/students/${data.id}`);
        } else {
          setError('ไม่พบข้อมูลนักเรียน');
        }
      } catch {
        setError('เกิดข้อผิดพลาด');
      }
    }
    resolve();
  }, [router]);

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
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      </div>
    </div>
  );
}