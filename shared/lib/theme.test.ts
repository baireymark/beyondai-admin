import { describe, expect, it } from 'vitest';

import { parseTheme, themeAttribute } from './theme';

describe('parseTheme', () => {
  it('accepts the known themes', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('system')).toBe('system');
  });

  it('falls back to system for a missing or unknown value', () => {
    expect(parseTheme(undefined)).toBe('system');
    expect(parseTheme('sepia')).toBe('system');
  });
});

describe('themeAttribute', () => {
  it('sets no attribute when following the system', () => {
    expect(themeAttribute('system')).toBeUndefined();
    expect(themeAttribute('dark')).toBe('dark');
  });
});
