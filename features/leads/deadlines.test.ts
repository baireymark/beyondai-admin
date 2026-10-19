import { isOverdue, overdueWhere, replyDueAt } from './deadlines';

const created = new Date('2026-10-19T02:00:00Z');
const due = replyDueAt(created);
const afterDue = new Date(due.getTime() + 1);

describe('replyDueAt', () => {
  it('is 24 hours after creation', () => {
    expect(due.toISOString()).toBe('2026-10-20T02:00:00.000Z');
  });
});

describe('isOverdue', () => {
  const lead = { status: 'NEW' as const, replyDueAt: due, firstContactedAt: null };

  it('is false before the deadline', () => {
    expect(isOverdue(lead, created)).toBe(false);
  });

  it('is false exactly at the deadline', () => {
    expect(isOverdue(lead, due)).toBe(false);
  });

  it('is true past the deadline with no first contact', () => {
    expect(isOverdue(lead, afterDue)).toBe(true);
    expect(isOverdue({ ...lead, status: 'CONTACTED' }, afterDue)).toBe(true);
  });

  it('is false once someone made first contact', () => {
    expect(isOverdue({ ...lead, firstContactedAt: created }, afterDue)).toBe(false);
  });

  it('is false for qualified or closed enquiries', () => {
    for (const status of ['QUALIFIED', 'WON', 'LOST'] as const) {
      expect(isOverdue({ ...lead, status }, afterDue)).toBe(false);
    }
  });
});

it('overdueWhere encodes the same rule for the database', () => {
  expect(overdueWhere(afterDue)).toEqual({
    firstContactedAt: null,
    replyDueAt: { lt: afterDue },
    status: { in: ['NEW', 'CONTACTED'] },
  });
});
