import { describe, expect, it } from 'vitest';
import { propertyTagText } from './FoodPropertyTag';

describe('propertyTagText', () => {
  it('always names the level, in plain words', () => {
    expect(propertyTagText('oxalate', 'very_high')).toBe('Very high oxalate');
    expect(propertyTagText('oxalate', 'high')).toBe('High oxalate');
    expect(propertyTagText('histamine', 'moderate')).toBe('Moderate histamine');
    expect(propertyTagText('fodmap', 'high')).toBe('High FODMAP');
  });

  it('describes yes/no facts without a level', () => {
    expect(propertyTagText('histamine_liberator', 'high')).toBe('May release histamine');
    expect(propertyTagText('nightshade', 'high')).toBe('Nightshade');
  });

  it('never shows an underscore', () => {
    expect(propertyTagText('new_property', 'very_high')).not.toContain('_');
  });
});
