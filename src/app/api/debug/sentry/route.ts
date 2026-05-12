import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request) {
  const expectedToken = process.env.SENTRY_TEST_TOKEN;
  if (!expectedToken) return true;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return queryToken === expectedToken || bearerToken === expectedToken;
}

export async function GET(request: Request) {
  if (process.env.ENABLE_SENTRY_TEST_ROUTE !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dsnConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
  const error = new Error('Sentry verification test error');
  const eventId = Sentry.captureException(error, {
    level: 'error',
    tags: {
      source: 'sentry-debug-route',
    },
  });

  await Sentry.flush(2000);

  return NextResponse.json({
    ok: true,
    dsnConfigured,
    eventId,
  });
}
