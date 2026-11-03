import { describe, it, expect } from 'vitest';
import { parsePropertyKey } from './engine';

describe('parsePropertyKey', () => {
  it('handles two-word severities', () => {
    expect(parsePropertyKey('food_property:oxalate_very_high')).toEqual({ property: 'oxalate', severity: 'very_high' });
    expect(parsePropertyKey('food_property:amines_very_high')).toEqual({ property: 'amines', severity: 'very_high' });
  });
  it('handles one-word severities and the nightshade boolean', () => {
    expect(parsePropertyKey('food_property:lectin_moderate')).toEqual({ property: 'lectin', severity: 'moderate' });
    expect(parsePropertyKey('food_property:nightshade_high')).toEqual({ property: 'nightshade', severity: 'high' });
  });
});

describe('yes/no food facts', () => {
  it('parse and label without a level', async () => {
    const { extractFactorsFromDay } = await import('./single-factor');
    expect(parsePropertyKey('food_property:histamine_liberator_high')).toEqual({ property: 'histamine_liberator', severity: 'high' });
    const day = { foods: [{ name: 'Strawberries', properties: [{ property: 'histamine_liberator', severity: 'high' }] }], supplements: [], medications: [], exposures: [], symptoms: [], exercises: [], detox: [] } as never;
    const labels = extractFactorsFromDay(day).map((f) => f.label);
    expect(labels).toContain('May release histamine food');
  });
});

