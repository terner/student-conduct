import { notFound } from 'next/navigation';
import { SentryExampleClient } from './sentry-example-client';

export const dynamic = 'force-dynamic';

export default function SentryExamplePage() {
  if (process.env.ENABLE_SENTRY_TEST_ROUTE !== 'true') {
    notFound();
  }

  return <SentryExampleClient />;
}
