'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// Manila is UTC+8 all year; getTimezoneOffset() reports it as -480 minutes.
const MANILA_OFFSET_MINUTES = -480;

/**
 * The viewer's own local time for a date, shown as a secondary label next to
 * Manila time, unless the viewer's clock already matches Manila. Renders
 * nothing on the server, where the viewer's time zone is unknown, so
 * hydration never mismatches.
 */
export function LocalTime({ date, className }: { date: string; className?: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => {
      if (new Date(date).getTimezoneOffset() === MANILA_OFFSET_MINUTES) return null;
      // dateStyle and timeStyle cannot be combined with timeZoneName.
      const formatted = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(new Date(date));
      return `Your time: ${formatted}`;
    },
    () => null,
  );
  return label ? <span className={className}>{label}</span> : null;
}
