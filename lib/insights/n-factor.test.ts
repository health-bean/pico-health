import { describe, it, expect } from 'vitest';
import { analyzeMultiFactors } from './n-factor';
import type { DayComposite, SingleFactorResult } from './types';

const makeDay = (date: string, overrides: Partial<DayComposite> = {}): DayComposite => ({
  userId: 'u1', date,
  foods: [], symptoms: [], supplements: [], medications: [],
  exposures: [], exercises: [],
  journal: { sleep: null, energy: null, mood: null, stress: null, pain: null },
  foodCount: 0, symptomCount: 0, supplementCount: 0, medicationCount: 0,
  exposureCount: 0, exerciseCount: 0,
  protocolId: null, compliancePct: null, violationCount: 0,
  entryCount: 0, hasJournal: false, isFlareDay: false, hasLateMeal: false,
  ...overrides,
});

const makeSingle = (factorKey: string, factorLabel: string, factorCategory: string, outcomeKey: string, outcomeLabel: string, conditionalRate: number, frequency: number): SingleFactorResult => ({
  factor: { category: factorCategory as SingleFactorResult['factor']['category'], key: factorKey, label: factorLabel },
  outcome: { type: 'symptom_occurrence', key: outcomeKey, label: outcomeLabel },
  frequency,
  totalOpportunities: frequency + 2,
  baseRate: 0.1,
  conditionalRate,
  rateMultiplier: conditionalRate / 0.1,
  recencyDays: 0,
  impactScore: 0.8,
  direction: 'increases',
  confidence: 'moderate',
  description: 'test',
});

describe('analyzeMultiFactors', () => {
  it('finds 2-factor pattern when combo is stronger than singles', () => {
    const days: DayComposite[] = [];
    // Eggs only, no headache (3 days)
    for (let i = 0; i < 3; i++) {
      days.push(makeDay(`2026-04-${String(i + 1).padStart(2, '0')}`, {
        foods: [{ foodId: 'f1', name: 'Eggs', properties: [], mealType: null, time: null, protocolStatus: null }],
        symptoms: [], foodCount: 1, symptomCount: 0,
      }));
    }
    // Poor sleep only, no headache (3 days)
    for (let i = 3; i < 6; i++) {
      days.push(makeDay(`2026-04-${String(i + 1).padStart(2, '0')}`, {
        journal: { sleep: 3, energy: null, mood: null, stress: null, pain: null },
        hasJournal: true, symptoms: [], symptomCount: 0,
      }));
    }
    // Both + headache (5 days)
    for (let i = 6; i < 11; i++) {
      days.push(makeDay(`2026-04-${String(i + 1).padStart(2, '0')}`, {
        foods: [{ foodId: 'f1', name: 'Eggs', properties: [], mealType: null, time: null, protocolStatus: null }],
        journal: { sleep: 3, energy: null, mood: null, stress: null, pain: null },
        hasJournal: true,
        symptoms: [{ name: 'Headache', severity: 5, time: null }],
        foodCount: 1, symptomCount: 1,
      }));
    }
    // Clean days (5 days)
    for (let i = 11; i < 16; i++) {
      days.push(makeDay(`2026-04-${String(i + 1).padStart(2, '0')}`));
    }

    const singleResults: SingleFactorResult[] = [
      makeSingle('food:eggs', 'Eggs', 'food', 'symptom:headache', 'Headache', 5 / 8, 5),
      makeSingle('sleep:poor', 'Poor sleep', 'sleep', 'symptom:headache', 'Headache', 5 / 8, 5),
    ];

    const results = analyzeMultiFactors(days, singleResults);
    const twoFactor = results.find(r => r.factorCount === 2);
    expect(twoFactor).toBeDefined();
    expect(twoFactor!.factors).toHaveLength(2);
    expect(twoFactor!.frequency).toBe(5);
  });

  it('respects 5 co-occurrence gate for 2-factor', () => {
    const days: DayComposite[] = [];
    for (let i = 0; i < 4; i++) {
      days.push(makeDay(`2026-04-${String(i + 1).padStart(2, '0')}`, {
        foods: [{ foodId: 'f1', name: 'Eggs', properties: [], mealType: null, time: null, protocolStatus: null }],
        journal: { sleep: 3, energy: null, mood: null, stress: null, pain: null },
        hasJournal: true,
        symptoms: [{ name: 'Headache', severity: 5, time: null }],
        foodCount: 1, symptomCount: 1,
      }));
    }

    const singleResults: SingleFactorResult[] = [
      makeSingle('food:eggs', 'Eggs', 'food', 'symptom:headache', 'Headache', 1, 4),
      makeSingle('sleep:poor', 'Poor sleep', 'sleep', 'symptom:headache', 'Headache', 1, 4),
    ];

    const results = analyzeMultiFactors(days, singleResults);
    expect(results).toHaveLength(0);
  });

  it('returns empty for no significant singles', () => {
    const results = analyzeMultiFactors([], []);
    expect(results).toHaveLength(0);
  });
});
