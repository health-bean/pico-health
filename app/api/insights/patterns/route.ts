import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { runInsightsEngine } from '@/lib/insights/engine';
import { cacheGet, cacheSet } from '@/lib/cache/insights';

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const daysParam = req.nextUrl.searchParams.get('days');
  const days = Math.min(Math.max(parseInt(daysParam ?? '90', 10) || 90, 1), 365);

  const cacheKey = `insights:v3:${session.userId}:${days}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  const output = await runInsightsEngine(session.userId, days);
  await cacheSet(cacheKey, output, 300);

  return NextResponse.json(output);
}
