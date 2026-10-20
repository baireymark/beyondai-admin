import { useId } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * The BeyondAi mark: two interlocking ribbons around an open centre. The
 * centre is transparent, so the mark sits on light and dark backgrounds.
 * app/icon.svg is the same drawing; change both together.
 */
export function LogoMark({ className }: { className?: string }) {
  // Unique gradient ids so two marks on one page don't share definitions.
  const id = useId();
  const back = `${id}-back`;
  const front = `${id}-front`;

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('shrink-0', className)}>
      <defs>
        <linearGradient id={back} x1="0.1" y1="0.1" x2="0.95" y2="0.75">
          <stop offset="0" stopColor="#241640" />
          <stop offset="0.35" stopColor="#5A2448" />
          <stop offset="0.7" stopColor="#E9561F" />
          <stop offset="1" stopColor="#FFB257" />
        </linearGradient>
        <radialGradient id={front} cx="37" cy="30" r="34" gradientUnits="userSpaceOnUse">
          <stop offset="0.48" stopColor="#2A1846" />
          <stop offset="0.6" stopColor="#B8392C" />
          <stop offset="0.74" stopColor="#F58A3C" />
          <stop offset="0.86" stopColor="#FFC861" />
          <stop offset="1" stopColor="#FF7A5C" />
        </radialGradient>
      </defs>
      <path
        fill={`url(#${back})`}
        d="M8 11C16 3 34 1 46 6c12 6 17 20 15 32-2 9-7 15-13 19 4-11 3-27-4-37C38 12 26 8 8 11Z"
      />
      <path
        fill={`url(#${front})`}
        d="M17 2C6 8 1 22 2 34c1 14 10 24 24 27 8 2 18 2 26 1-10-4-21-7-28-15-7-8-8-21-5-30 2-6 6-9 11-11-4-2-9-3-13-4Z"
      />
      <path fill="#24204A" d="M26 13c-6 9-6 26 0 37-3-11-3-26 0-37Z" />
      <path fill="#24204A" d="M39 15c5 10 6 25 2 37 1-12 0-26-2-37Z" />
    </svg>
  );
}

/**
 * Mark plus "BeyondAi" wordmark, with an optional small label (e.g. "Admin")
 * set under the wordmark. Decorative: give the parent an accessible name.
 */
export function Logo({
  className,
  markClassName,
  label,
}: {
  className?: string;
  markClassName?: string;
  label?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={cn('size-8', markClassName)} />
      <span aria-hidden="true" className="flex flex-col">
        <span className="font-brand text-[1.375em] leading-none font-semibold tracking-tight">
          Beyond<span className="text-brand">Ai</span>
        </span>
        {label ? (
          <span className="mt-1 text-[0.625rem] leading-none font-medium tracking-[0.2em] text-fg-muted uppercase">
            {label}
          </span>
        ) : null}
      </span>
    </span>
  );
}
