import type { InsightsOutput, InsightAlert, AlertType, SingleFactorResult, MultiFactorResult } from './types';
import { insightKey } from './types';

/**
 * Turn the current engine output into alerts for anything the previous
 * snapshot did not already know about. An alert is a nudge toward a curated
 * row, so it only fires for a result whose own numbers back its direction:
 * a trigger must raise the outcome above its base rate, a helper must lower
 * it. A "pattern" that runs the wrong way is a non-finding, not news.
 */
export function detectNewAlerts(
  current: InsightsOutput,
  previousInsightKeys: Set<string>,
): Omit<InsightAlert, 'id' | 'createdAt' | 'dismissedAt'>[] {
  const alerts: Omit<InsightAlert, 'id' | 'createdAt' | 'dismissedAt'>[] = [];

  const allResults = [...current.triggers, ...current.helpers];

  for (const result of allResults) {
    if (!ratesSupportDirection(result)) continue;

    const factors = 'factors' in result ? (result as MultiFactorResult).factors : [(result as SingleFactorResult).factor];
    const key = insightKey(factors, result.outcome);

    if (previousInsightKeys.has(key)) continue;

    alerts.push({
      alertType: 'new_pattern' as AlertType,
      insightKey: key,
      title: `New pattern: ${factors.map(f => f.label.toLowerCase()).join(' + ')}`,
      body: result.description,
      detail: {
        factors: factors.map(f => f.key),
        outcome: result.outcome.key,
        frequency: result.frequency,
        conditionalRate: result.conditionalRate,
        baseRate: 'baseRate' in result ? result.baseRate : null,
        rateMultiplier: result.rateMultiplier,
        direction: result.direction,
      },
      dismissed: false,
    });
  }

  for (const obs of current.progress) {
    const key = `progress:${obs.metric}`;
    if (previousInsightKeys.has(key)) continue;

    // Compare shares of logged days, not counts: logging less is not getting better.
    const before = obs.previousPeriod.count / obs.previousPeriod.days;
    const now = obs.currentPeriod.count / obs.currentPeriod.days;
    if (before > 0 && now < before * 0.6) {
      alerts.push({
        alertType: 'progress_milestone' as AlertType,
        insightKey: key,
        title: obs.label,
        body: obs.observation,
        detail: { metric: obs.metric },
        dismissed: false,
      });
    }
  }

  return alerts;
}

/** rateMultiplier is conditional/base: above 1 the factor raises the outcome, below 1 it lowers it. */
function ratesSupportDirection(result: SingleFactorResult | MultiFactorResult): boolean {
  if (result.direction === 'increases') return result.rateMultiplier > 1;
  if (result.direction === 'decreases') return result.rateMultiplier < 1;
  return false;
}

/** A progress milestone may be raised again after this long; a pattern never is. */
export const PROGRESS_REPEAT_DAYS = 30;

/**
 * Drop alerts the user has already been shown. A pattern alert is raised
 * once per pattern, ever: if it fades and comes back, or was dismissed, it
 * doesn't return as "new". A progress milestone can return after
 * PROGRESS_REPEAT_DAYS, since getting better again is news.
 */
export function withoutAlreadyRaised<T extends { insightKey: string; alertType: string }>(
  alerts: T[],
  existing: { insightKey: string; createdAt: Date }[],
  now: Date = new Date(),
): T[] {
  const lastRaised = new Map<string, number>();
  for (const e of existing) {
    const t = e.createdAt.getTime();
    if (t > (lastRaised.get(e.insightKey) ?? -Infinity)) lastRaised.set(e.insightKey, t);
  }
  const repeatAfterMs = PROGRESS_REPEAT_DAYS * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  return alerts.filter(a => {
    if (seen.has(a.insightKey)) return false;
    seen.add(a.insightKey);
    const last = lastRaised.get(a.insightKey);
    if (last === undefined) return true;
    return a.alertType === 'progress_milestone' && now.getTime() - last >= repeatAfterMs;
  });
}
