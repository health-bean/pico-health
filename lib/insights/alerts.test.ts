import { describe, it, expect } from 'vitest';
import { detectNewAlerts } from './alerts';
import type { InsightsOutput } from './types';

const makeOutput = (overrides: Partial<InsightsOutput> = {}): InsightsOutput => ({
  triggers: [], helpers: [], propertyPatterns: [], progress: [],
  dataStatus: { daysTracked: 30, daysAnalyzed: 90, loggingConsistency: 0.8, singleFactors: 5, twoFactorPatterns: 0, threeFactorPatterns: 0 },
  ...overrides,
});

describe('detectNewAlerts', () => {
  it('creates alert for new pattern not in previous snapshot', () => {
    const current = makeOutput({
      triggers: [{
        factor: { category: 'food', key: 'food:eggs', label: 'Eggs' },
        outcome: { type: 'symptom_occurrence', key: 'symptom:headache', label: 'Headache' },
        frequency: 5, totalOpportunities: 8, baseRate: 0.1, conditionalRate: 0.6,
        rateMultiplier: 6, recencyDays: 1, impactScore: 0.8, direction: 'increases',
        description: 'On days with eggs, headache was 6x more frequent (seen 5 times)',
      }],
    });

    const alerts = detectNewAlerts(current, new Set());
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe('new_pattern');
    expect(alerts[0].title).toContain('eggs');
  });

  it('skips patterns already seen', () => {
    const current = makeOutput({
      triggers: [{
        factor: { category: 'food', key: 'food:eggs', label: 'Eggs' },
        outcome: { type: 'symptom_occurrence', key: 'symptom:headache', label: 'Headache' },
        frequency: 5, totalOpportunities: 8, baseRate: 0.1, conditionalRate: 0.6,
        rateMultiplier: 6, recencyDays: 1, impactScore: 0.8, direction: 'increases',
        description: 'test',
      }],
    });

    const alerts = detectNewAlerts(current, new Set(['food:eggs→symptom:headache']));
    expect(alerts).toHaveLength(0);
  });

  it('skips a trigger whose conditional rate is not above its base rate', () => {
    const current = makeOutput({
      triggers: [{
        factor: { category: 'food', key: 'food:bell_pepper', label: 'Bell peppers' },
        outcome: { type: 'symptom_occurrence', key: 'symptom:headache', label: 'Headache' },
        frequency: 16, totalOpportunities: 68, baseRate: 0.31, conditionalRate: 0.24,
        rateMultiplier: 0.77, recencyDays: 1, impactScore: 0.2, direction: 'increases',
        description: 'Headache on 16 of 68 days with bell peppers (24%), vs 31% of days without',
      }],
    });

    expect(detectNewAlerts(current, new Set())).toHaveLength(0);
  });

  it('skips a helper whose conditional rate is not below its base rate', () => {
    const current = makeOutput({
      helpers: [{
        factor: { category: 'supplement', key: 'supplement:magnesium', label: 'Magnesium' },
        outcome: { type: 'symptom_occurrence', key: 'symptom:headache', label: 'Headache' },
        frequency: 10, totalOpportunities: 20, baseRate: 0.3, conditionalRate: 0.5,
        rateMultiplier: 1.6, recencyDays: 1, impactScore: 0.2, direction: 'decreases',
        description: 'test',
      }],
    });

    expect(detectNewAlerts(current, new Set())).toHaveLength(0);
  });

  it('records the rates behind a pattern alert', () => {
    const current = makeOutput({
      triggers: [{
        factor: { category: 'food', key: 'food:eggs', label: 'Eggs' },
        outcome: { type: 'symptom_occurrence', key: 'symptom:headache', label: 'Headache' },
        frequency: 5, totalOpportunities: 8, baseRate: 0.1, conditionalRate: 0.6,
        rateMultiplier: 6, recencyDays: 1, impactScore: 0.8, direction: 'increases',
        description: 'test',
      }],
    });

    const [alert] = detectNewAlerts(current, new Set());
    expect(alert.detail).toMatchObject({ conditionalRate: 0.6, baseRate: 0.1, direction: 'increases' });
  });

  it('creates progress milestone alert for significant improvement', () => {
    const current = makeOutput({
      progress: [{
        metric: 'symptom_frequency:headache',
        label: 'Headache frequency',
        currentPeriod: { count: 2, days: 30, label: 'Apr' },
        previousPeriod: { count: 8, days: 30, label: 'Mar' },
        observation: 'Headache frequency: 8 in Mar, 2 in Apr',
      }],
    });

    const alerts = detectNewAlerts(current, new Set());
    const milestone = alerts.find(a => a.alertType === 'progress_milestone');
    expect(milestone).toBeDefined();
  });

  it('skips a progress milestone the previous snapshot already raised', () => {
    const current = makeOutput({
      progress: [{
        metric: 'symptom_frequency:headache',
        label: 'Headache frequency',
        currentPeriod: { count: 2, days: 30, label: 'Apr' },
        previousPeriod: { count: 8, days: 30, label: 'Mar' },
        observation: 'Headache frequency: 8 in Mar, 2 in Apr',
      }],
    });

    expect(detectNewAlerts(current, new Set(['progress:symptom_frequency:headache']))).toHaveLength(0);
  });

  it('does not create progress alert for marginal change', () => {
    const current = makeOutput({
      progress: [{
        metric: 'symptom_frequency:headache',
        label: 'Headache frequency',
        currentPeriod: { count: 7, days: 30, label: 'Apr' },
        previousPeriod: { count: 8, days: 30, label: 'Mar' },
        observation: 'Headache frequency: 8 in Mar, 7 in Apr',
      }],
    });

    const alerts = detectNewAlerts(current, new Set());
    expect(alerts).toHaveLength(0);
  });
});
