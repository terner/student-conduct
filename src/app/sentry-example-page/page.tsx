import { notFound } from 'next/navigation';
import { SentryExampleClient } from './sentry-example-client';

export const dynamic = 'force-dynamic';

export default async function SentryExamplePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const expectedToken = process.env.SENTRY_TEST_TOKEN;
  const params = await searchParams;

  if (!expectedToken || params.token !== expectedToken) {
    notFound();
  }

  return <SentryExampleClient />;
}
