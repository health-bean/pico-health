import { describe, it, expect } from 'vitest';
import { generateNullDays, runNullSim } from './null-sim';

describe('null simulation', () => {
  it('is deterministic for a seed, so a gate change is the only thing that moves the numbers', () => {
    expect(runNullSim({ days: 90, seed: 7 })).toEqual(runNullSim({ days: 90, seed: 7 }));
  });

  it('generates the requested window with symptoms on a realistic share of days', () => {
    const days = generateNullDays({ days: 90, seed: 1 });
    expect(days).toHaveLength(90);
    const withSymptoms = days.filter(d => d.symptoms.length > 0).length;
    expect(withSymptoms).toBeGreaterThan(50);
  });
});
