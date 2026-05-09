'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3 text-center max-w-md">
        <AlertTriangle className="size-10 text-destructive" />
        <h2 className="text-lg font-semibold">เกิดข้อผิดพลาด</h2>
        <p className="text-sm text-muted-foreground">{error.message || 'โปรดลองอีกครั้ง'}</p>
        <Button variant="outline" onClick={reset}>ลองอีกครั้ง</Button>
      </div>
    </div>
  );
}
