import { NextResponse } from 'next/server';
import { getLinePublicConfig } from '@/lib/line/client';

export async function GET() {
  const config = await getLinePublicConfig();
  return NextResponse.json(config);
}
