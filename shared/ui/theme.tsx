'use client';

import { createContext, use, useState, type ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { THEME_COOKIE, themeAttribute, type Theme } from '@/shared/lib/theme';

const ONE_YEAR = 60 * 60 * 24 * 365;

const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void } | null>(null);

/** Holds the theme the server rendered with, and applies changes to <html>. */
export function ThemeProvider({ initial, children }: { initial: Theme; children: ReactNode }) {
  const [theme, setThemeState] = useState(initial);

  function setTheme(next: Theme) {
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie =
      next === 'system'
        ? `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`
        : `${THEME_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;
    const attribute = themeAttribute(next);
    if (attribute) document.documentElement.dataset.theme = attribute;
    else delete document.documentElement.dataset.theme;
    setThemeState(next);
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}

const icon = 'size-4';

const OPTIONS: { value: Theme; label: string; icon: ReactNode }[] = [
  {
    value: 'system',
    label: 'System theme',
    icon: (
      <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Light theme',
    icon: (
      <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark theme',
    icon: (
      <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
];

/** Three-way switch between the system, light and dark themes. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn('inline-flex rounded-lg border border-border bg-bg p-0.5', className)}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={theme === option.value}
          title={option.label}
          onClick={() => setTheme(option.value)}
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-md transition',
            theme === option.value
              ? 'bg-surface text-primary shadow-sm'
              : 'text-fg-muted hover:text-fg',
          )}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
