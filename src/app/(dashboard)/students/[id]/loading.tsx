import { Spinner } from '@/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <Spinner className="size-8" />
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      </div>
    </div>
  );
}
