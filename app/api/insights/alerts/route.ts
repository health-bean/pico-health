import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { insightAlerts } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

/** Alerts older than this are stale news; the curated sections carry them now. */
const ALERT_WINDOW_DAYS = 30;
const ALERT_LIMIT = 20;

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - ALERT_WINDOW_DAYS);

  const alerts = await db.select().from(insightAlerts)
    .where(and(
      eq(insightAlerts.userId, session.userId),
      eq(insightAlerts.dismissed, false),
      gte(insightAlerts.createdAt, since),
    ))
    .orderBy(desc(insightAlerts.createdAt))
    .limit(ALERT_LIMIT);

  return NextResponse.json(alerts);
}

/** Dismiss every open alert for the signed-in user ("Clear all"). */
export async function PATCH() {
  const session = await getSessionFromCookies();
  if (!session?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.update(insightAlerts)
    .set({ dismissed: true, dismissedAt: new Date() })
    .where(and(eq(insightAlerts.userId, session.userId), eq(insightAlerts.dismissed, false)));

  return NextResponse.json({ success: true });
}
