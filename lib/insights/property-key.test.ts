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
