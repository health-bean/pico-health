import { describe, expect, it } from 'vitest';
import { alsoLine, groupByCause } from './group-by-cause';
import type { MultiFactorResult, SingleFactorResult } from './types';

function row(key: string, outcome: string, n: number, of: number, extra: Partial<SingleFactorResult> = {}): SingleFactorResult {
  const flare = outcome === 'Flare day';
  const severe = /^Severe /.test(outcome);
  return {
    factor: { key, label: key.split(':')[1], category: key.split(':')[0] },
    outcome: { type: flare ? 'flare_day' : severe ? 'symptom_severity' : 'symptom_occurrence', key: outcome, label: outcome },
    frequency: n, totalOpportunities: of, baseRate: 0.1, conditionalRate: n / of, rateMultiplier: 3,
    recencyDays: 1, impactScore: 1, direction: 'increases', confidence: 'strong', description: '', ...extra,
  } as SingleFactorResult;
}

describe('groupByCause', () => {
  it('folds rows about the same cause into one card, keeping first-seen order', () => {
    const rows = [
      row('food:almonds', 'Joint pain', 16, 16, { basis: 'meals' }),
      row('exposure:mold', 'Brain fog', 14, 15),
      row('exposure:mold', 'Flare day', 13, 15),
      row('preparation:leftover', 'Hives', 11, 12),
      row('food:almonds', 'Flare day', 11, 16),
    ];
    const g = groupByCause(rows);
    expect(g.map((x) => x.lead.outcome.label)).toEqual(['Joint pain', 'Brain fog', 'Hives']);
    expect(g[1].others.map((x) => x.outcome.label)).toEqual(['Flare day']);
    expect(g[0].others).toHaveLength(1);
  });

  it('keeps combinations as cards of their own', () => {
    const combo = { factors: [{ key: 'food:a', label: 'A', category: 'food' }, { key: 'food:b', label: 'B', category: 'food' }], factorCount: 2 } as unknown as MultiFactorResult;
    expect(groupByCause([combo, combo])).toHaveLength(2);
  });
});

describe('alsoLine', () => {
  it('counts first, flares in words, and drops a severe row the card already counts', () => {
    const lead = row('exposure:mold', 'Brain fog', 14, 15);
    expect(alsoLine(lead, [row('exposure:mold', 'Flare day', 13, 15), row('exposure:mold', 'Severe Brain fog', 5, 15), row('exposure:mold', 'Joint pain', 8, 15)]))
      .toBe('Also: a flare on 13 of 15 days, joint pain on 8 of 15 days.');
  });

  it('says meal-timed rows as times, and what helps as less', () => {
    const lead = row('food:x', 'Hives', 3, 9);
    expect(alsoLine(lead, [row('food:x', 'Joint pain', 5, 6, { basis: 'meals' })])).toBe('Also: joint pain within 4 hours, 5 of 6 times.');
    const help = row('supplement:mag', 'Fatigue', 0, 29, { direction: 'decreases' });
    expect(alsoLine(help, [row('supplement:mag', 'Flare day', 7, 29, { direction: 'decreases' })])).toBe('Also: fewer flare days (7 of 29).');
  });

  it('is undefined when there is nothing else', () => {
    expect(alsoLine(row('food:x', 'Hives', 3, 9), [])).toBeUndefined();
  });
});
