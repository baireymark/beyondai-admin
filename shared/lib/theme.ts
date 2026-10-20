/**
 * Colour theme preference. "system" follows the operating system; the other
 * two force a theme. The choice lives in a cookie so the server can render
 * the right theme on the first paint, without an inline script (the CSP
 * forbids those).
 */
export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = 'theme';

export function parseTheme(value: string | undefined): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : 'system';
}

/** The value for the data-theme attribute on <html>. "system" sets none. */
export function themeAttribute(theme: Theme): 'light' | 'dark' | undefined {
  return theme === 'system' ? undefined : theme;
}
