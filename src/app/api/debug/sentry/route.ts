import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { apiMessage } from '@/lib/i18n/api';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request) {
  const expectedToken = process.env.SENTRY_TEST_TOKEN?.trim();
  if (!expectedToken) return false;

  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return queryToken === expectedToken || bearerToken === expectedToken;
}

export async function GET(request: Request) {
  if (!process.env.SENTRY_TEST_TOKEN?.trim()) {
    return NextResponse.json({ error: apiMessage(request, 'notFound') }, { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: apiMessage(request, 'unauthorized') }, { status: 401 });
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
