import { describe, expect, it } from 'vitest';
import { findingText, pct, propertyCards, propertyGroupTitle, propertyLine } from './finding-text';
import type { Factor, MultiFactorResult, Outcome, SingleFactorResult } from './types';

const joint: Outcome = { type: 'symptom', key: 'joint_pain', label: 'Joint pain' } as Outcome;
const fatigue: Outcome = { type: 'symptom', key: 'fatigue', label: 'Fatigue' } as Outcome;
const flare: Outcome = { type: 'flare_day', key: 'flare_day', label: 'Flare day' } as Outcome;
const f = (label: string, category = 'food'): Factor => ({ key: label.toLowerCase(), label, category } as Factor);

function single(over: Partial<SingleFactorResult>): SingleFactorResult {
  return {
    factor: f('Almonds'),
    outcome: joint,
    frequency: 14,
    totalOpportunities: 15,
    baseRate: 0.04,
    conditionalRate: 14 / 15,
    rateMultiplier: 5,
    recencyDays: 1,
    impactScore: 1,
    direction: 'increases',
    confidence: 'strong',
    description: '',
    ...over,
  };
}

describe('pct', () => {
  it('rounds, and never shows a small rate as 0%', () => {
    expect(pct(14 / 15)).toBe('93%');
    expect(pct(0)).toBe('0%');
    expect(pct(0.004)).toBe('under 1%');
    expect(pct(1)).toBe('100%');
  });
});

describe('findingText', () => {
  it('leads a day pattern with the count, % beside it', () => {
    const t = findingText(single({ factor: f('Mold', 'exposure'), outcome: { ...joint, label: 'Brain fog' } }));
    expect(t.title).toEqual({ factor: 'Mold', outcome: 'brain fog' });
    expect(t.sentence).toBe('On days with mold, brain fog showed up on 14 of 15 days.');
    expect(t.compare).toBe('93% of those days, vs 4% of other days');
  });

  it('counts times, not days, for meal timing', () => {
    const t = findingText(single({ basis: 'meals', frequency: 16, totalOpportunities: 16, conditionalRate: 1, baseRate: 0.02 }));
    expect(t.sentence).toBe('Joint pain came within 4 hours of almonds 16 of 16 times.');
    expect(t.compare).toBe('100% of the time, vs 2% after other meals');
  });

  it('says what a flare day is about', () => {
    const t = findingText(single({ factor: f('Mold', 'exposure'), outcome: flare, frequency: 13, conditionalRate: 13 / 15, baseRate: 0.18 }));
    expect(t.title.outcome).toBe('flare days');
    expect(t.sentence).toBe('On days with mold, 13 of 15 were flare days.');
  });

  it('frames a helper as less of the symptom, still count first', () => {
    const t = findingText(
      single({ factor: f('Magnesium glycinate', 'supplement'), outcome: fatigue, frequency: 0, totalOpportunities: 29, conditionalRate: 0, baseRate: 0.42, direction: 'decreases' })
    );
    expect(t.title).toEqual({ factor: 'Magnesium glycinate', outcome: 'less fatigue' });
    expect(t.sentence).toBe('On days with magnesium glycinate, fatigue showed up on 0 of 29 days.');
    expect(t.compare).toBe('0% of those days, vs 42% of other days');
    expect(findingText(single({ outcome: flare, direction: 'decreases' })).title.outcome).toBe('fewer flare days');
  });

  it('uses the right preposition for cycle phases', () => {
    const t = findingText(single({ factor: f('The week before your period', 'cycle'), outcome: { ...joint, label: 'Headache' } }));
    expect(t.sentence.startsWith('In the week before your period, headache showed up on 14 of 15 days')).toBe(true);
  });

  it('compares a combination with either part alone', () => {
    const r: MultiFactorResult = {
      factors: [f('Spinach'), f('Leftover food', 'food')],
      factorCount: 2,
      outcome: { ...joint, label: 'Hives' },
      frequency: 6,
      coOccurrences: 7,
      conditionalRate: 6 / 7,
      bestSubRate: 0.4,
      direction: 'increases',
      confidence: 'moderate',
      rateMultiplier: 2,
      recencyDays: 3,
      impactScore: 1,
      description: '',
      absorbed: [],
    };
    const t = findingText(r);
    expect(t.title).toEqual({ factor: 'Spinach + Leftover food', outcome: 'hives' });
    expect(t.sentence).toBe('On days with both spinach and leftover food, hives showed up on 6 of 7 days.');
    expect(t.compare).toBe('86% of those days, vs 40% with either one alone');
  });

  it('never shows a percentage without the count it came from', () => {
    const t = findingText(single({}));
    expect(t.sentence).toMatch(/\d+ of \d+/);
    expect(t.compare).toMatch(/%/);
  });
});

describe('propertyGroupTitle', () => {
  it('reads levelled properties naturally', () => {
    expect(propertyGroupTitle('oxalate', 'high')).toBe('Foods high in oxalate');
    expect(propertyGroupTitle('oxalate', 'very_high')).toBe('Foods very high in oxalate');
    expect(propertyGroupTitle('histamine', 'moderate')).toBe('Foods with moderate histamine');
    expect(propertyGroupTitle('fodmap', 'high')).toBe('Foods high in FODMAP');
  });

  it('names yes/no properties without a level, and never leaks a raw key', () => {
    expect(propertyGroupTitle('histamine_liberator', 'high')).toBe('Foods that can release histamine');
    expect(propertyGroupTitle('nightshade', 'high')).toBe('Nightshades');
    expect(propertyGroupTitle('some_new_property', 'high')).not.toContain('_');
  });
});

describe('propertyLine', () => {
  it('counts every line, and says flare plainly', () => {
    expect(propertyLine('Joint pain', 10, 10)).toBe('Joint pain on 10 of 10 days');
    expect(propertyLine('Flare day', 8, 10)).toBe('A flare on 8 of 10 days');
  });
});

describe('propertyCards', () => {
  const row = (property: string, severity: string, outcome: string, frequency: number, impactScore = 1) => ({
    property,
    severity,
    foods: ['Spinach', 'Almonds', 'Kale'],
    outcome: { label: outcome },
    frequency,
    totalOpportunities: 10,
    impactScore,
  });

  it('says which days were counted, then each symptom', () => {
    const [c] = propertyCards([row('oxalate', 'high', 'Joint pain', 10), row('oxalate', 'high', 'Flare day', 8), row('oxalate', 'high', 'Brain fog', 7)]);
    expect(c.title).toBe('Foods high in oxalate');
    expect(c.sentence).toBe('On the 10 days you had spinach, almonds or kale: Joint pain on all 10, a flare on 8, brain fog on 7.');
  });

  it('merges two properties with the same foods and the same counts into one card', () => {
    const cards = propertyCards([
      row('histamine', 'moderate', 'Joint pain', 10, 2),
      row('histamine_liberator', 'high', 'Joint pain', 10, 1),
    ]);
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe('Foods with moderate histamine or that can release histamine');
  });

  it('keeps properties apart when their counts differ', () => {
    expect(propertyCards([row('histamine', 'moderate', 'Joint pain', 10), row('oxalate', 'high', 'Joint pain', 6)])).toHaveLength(2);
  });

  it('falls back to "these foods" when the engine names none', () => {
    const [c] = propertyCards([{ ...row('oxalate', 'high', 'Hives', 4), foods: [] }]);
    expect(c.sentence).toBe('On the 10 days you had these foods: Hives on 4.');
  });

  it('shortens a long food list', () => {
    const [c] = propertyCards([{ ...row('oxalate', 'high', 'Hives', 4), foods: ['A', 'B', 'C', 'D', 'E'] }]);
    expect(c.sentence).toContain('a, b, c and 2 more');
  });
});
