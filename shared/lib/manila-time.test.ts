import {
  addDays,
  formatManila,
  formatManilaCompact,
  parseManilaDate,
  startOfManilaDay,
  startOfManilaWeek,
} from './manila-time';

describe('startOfManilaDay', () => {
  it('returns Manila midnight, which is 16:00 UTC the day before', () => {
    // 2026-10-19 09:30 in Manila
    expect(startOfManilaDay(new Date('2026-10-19T01:30:00Z')).toISOString()).toBe(
      '2026-10-18T16:00:00.000Z',
    );
  });

  it('rolls over to the next Manila day at 16:00 UTC', () => {
    expect(startOfManilaDay(new Date('2026-10-19T16:00:00Z')).toISOString()).toBe(
      '2026-10-19T16:00:00.000Z',
    );
    expect(startOfManilaDay(new Date('2026-10-19T15:59:59Z')).toISOString()).toBe(
      '2026-10-18T16:00:00.000Z',
    );
  });
});

describe('startOfManilaWeek', () => {
  it('starts the week on Monday in Manila', () => {
    // Sunday 2026-10-25 08:00 in Manila belongs to the week of Monday 2026-10-19
    expect(startOfManilaWeek(new Date('2026-10-25T00:00:00Z')).toISOString()).toBe(
      '2026-10-18T16:00:00.000Z',
    );
    // Monday 2026-10-19 00:30 in Manila is the first day of its own week
    expect(startOfManilaWeek(new Date('2026-10-18T16:30:00Z')).toISOString()).toBe(
      '2026-10-18T16:00:00.000Z',
    );
  });
});

describe('parseManilaDate', () => {
  it('parses a calendar date as Manila midnight', () => {
    expect(parseManilaDate('2026-10-19')?.toISOString()).toBe('2026-10-18T16:00:00.000Z');
  });

  it('rejects malformed or impossible dates', () => {
    expect(parseManilaDate('2026-02-30')).toBeNull();
    expect(parseManilaDate('19/10/2026')).toBeNull();
  });
});

describe('formatManila', () => {
  it('shows the time in Manila regardless of the server time zone', () => {
    expect(formatManila(new Date('2026-10-22T06:00:00Z'))).toMatch(/Oct 22, 2026.*2:00\sPM/);
  });
});

describe('formatManilaCompact', () => {
  const now = new Date('2026-10-19T01:00:00Z');

  it('drops the year within the current Manila year', () => {
    expect(formatManilaCompact(new Date('2026-10-22T06:00:00Z'), now)).toMatch(
      /^Oct 22, 2:00\sPM$/,
    );
  });

  it('decides the year in Manila time, not UTC', () => {
    // 17:00 UTC on Dec 31, 2025 is already Jan 1, 2026 in Manila.
    expect(formatManilaCompact(new Date('2025-12-31T17:00:00Z'), now)).toMatch(/^Jan 1, 1:00\sAM$/);
  });

  it('shows the date with its year for earlier years', () => {
    expect(formatManilaCompact(new Date('2025-06-01T00:00:00Z'), now)).toBe('Jun 1, 2025');
  });
});

it('addDays moves by whole days', () => {
  expect(addDays(new Date('2026-10-01T00:00:00Z'), 30).toISOString()).toBe(
    '2026-10-31T00:00:00.000Z',
  );
});
