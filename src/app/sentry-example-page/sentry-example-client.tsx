'use client';

import { Button } from '@/components/ui/button';

export function SentryExampleClient() {
  function triggerError() {
    (window as unknown as { myUndefinedFunction: () => void }).myUndefinedFunction();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold">Sentry example page</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click the button to trigger a client-side test error.
          </p>
        </div>
        <Button type="button" variant="destructive" onClick={triggerError}>
          Trigger test error
        </Button>
      </div>
    </main>
  );
}
