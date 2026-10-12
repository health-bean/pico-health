import { describe, it, expect } from 'vitest';
import { generateNullDays, runNullSim, summarize, plantedRecall, acuteRecall } from './null-sim';
import { assembleInsights } from './assemble';

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

  it('reports how much it compared, for the empty page to say', () => {
    const days = generateNullDays({ days: 90, seed: 3 });
    const { dataStatus } = assembleInsights(days, days[89].date, 90);
    expect(dataStatus.symptomsCompared).toBe(8);
    expect(dataStatus.factorsCompared).toBeGreaterThan(30);
  });

  // The budget. These are regression guards on the noise gates, measured at
  // 90 logged days over 20 seeds. If a change trips one, re-run
  // `npm run eval:insights-noise` and look at the whole table before
  // loosening anything.
  it('shows almost nothing by default when the logs contain no real pattern', () => {
    const s = summarize(90, 20);
    expect(s.rowsShown.median).toBeLessThanOrEqual(3);
    expect(s.rowsShown.max).toBeLessThanOrEqual(6);
    expect(s.combinationsShown.max).toBe(0);
  });

  it('still finds a real 2.5× food trigger by 180 days, and usually by 90', () => {
    const tomato = (days: number) => plantedRecall(days, 20).find(r => r.effect.cause === 'Tomatoes')!.recall;
    expect(tomato(90)).toBeGreaterThanOrEqual(0.4);
    expect(tomato(180)).toBeGreaterThanOrEqual(0.7);
  });

  it('shows an obvious reaction to a food eaten every third day within three weeks, when logged as it happens', () => {
    const [twoWeeks, threeWeeks] = acuteRecall('Oatmeal', 10, [14, 21], 20);
    expect(twoWeeks).toBeGreaterThanOrEqual(0.5);
    expect(threeWeeks).toBeGreaterThanOrEqual(0.9);
  });

  it('adds almost no noise from meal timing', () => {
    expect(summarize(90, 20).timedShown.median).toBe(0);
  });
});
