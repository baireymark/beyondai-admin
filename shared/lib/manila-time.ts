/**
 * Time helpers for Asia/Manila. The Philippines is UTC+8 all year with no
 * daylight saving time, so day and week boundaries are a fixed offset.
 */
export const MANILA_TIME_ZONE = 'Asia/Manila';

const OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight in Manila at the start of the day that contains `date`. */
export function startOfManilaDay(date: Date): Date {
  const shifted = date.getTime() + OFFSET_MS;
  return new Date(shifted - (((shifted % DAY_MS) + DAY_MS) % DAY_MS) - OFFSET_MS);
}

/** Midnight in Manila on the Monday of the week that contains `date`. */
export function startOfManilaWeek(date: Date): Date {
  const dayStart = startOfManilaDay(date);
  const weekday = new Date(dayStart.getTime() + OFFSET_MS).getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (weekday + 6) % 7;
  return new Date(dayStart.getTime() - daysSinceMonday * DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Parses "YYYY-MM-DD" as midnight in Manila. Returns null for anything else. */
export function parseManilaDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return new Date(utc - OFFSET_MS);
}

const formatters = {
  date: new Intl.DateTimeFormat('en-PH', { timeZone: MANILA_TIME_ZONE, dateStyle: 'medium' }),
  datetime: new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
};

/** Formats a date in Manila time, for example "Oct 19, 2026, 9:46 AM". */
export function formatManila(date: Date, style: keyof typeof formatters = 'datetime'): string {
  return formatters[style].format(date);
}

const compactThisYear = new Intl.DateTimeFormat('en-PH', {
  timeZone: MANILA_TIME_ZONE,
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const yearOnly = new Intl.DateTimeFormat('en-PH', { timeZone: MANILA_TIME_ZONE, year: 'numeric' });

/**
 * A short Manila time for tables: "Oct 19, 9:46 AM" within the current year,
 * "Oct 19, 2025" otherwise.
 */
export function formatManilaCompact(date: Date, now: Date = new Date()): string {
  return yearOnly.format(date) === yearOnly.format(now)
    ? compactThisYear.format(date)
    : formatters.date.format(date);
}
