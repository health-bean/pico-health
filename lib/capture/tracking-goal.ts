/**
 * A tracking goal ("track for 30 days", often a practitioner's ask). The Log
 * shows it only while it is being counted; before a goal exists and after it
 * is reached, it lives in Settings. Pure, so it can be tested.
 */

export interface GoalStats {
  trackingGoalDays: number | null;
  trackingGoalStartDate: string | null;
}

export interface GoalStatus {
  hasGoal: boolean;
  /** Day N of the goal, 1-based, capped at the goal length. */
  day: number;
  total: number;
  done: boolean;
  /** Shown on the Log: only while counting. */
  showOnLog: boolean;
  pct: number;
}

/** Calendar days from start to now, inclusive of the start day. */
export function dayOf(startDate: string, now: Date): number {
  const start = new Date(startDate + "T12:00:00");
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function goalStatus(stats: GoalStats, now: Date): GoalStatus {
  const total = stats.trackingGoalDays ?? 0;
  if (!stats.trackingGoalDays || !stats.trackingGoalStartDate) {
    return { hasGoal: false, day: 0, total: 0, done: false, showOnLog: false, pct: 0 };
  }
  const raw = dayOf(stats.trackingGoalStartDate, now);
  const day = Math.min(raw, total);
  const done = raw > total;
  return { hasGoal: true, day, total, done, showOnLog: !done, pct: Math.min(100, (day / total) * 100) };
}
