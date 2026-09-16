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

    if (obs.previousPeriod.count > 0 && obs.currentPeriod.count < obs.previousPeriod.count * 0.6) {
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
