import type { LeadStatus } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';

/** The public site promises a reply within 24 hours. */
export const REPLY_WINDOW_HOURS = 24;

/** Statuses that still count against the reply deadline. */
export const AWAITING_REPLY_STATUSES = [
  'NEW',
  'CONTACTED',
] as const satisfies readonly LeadStatus[];

export function replyDueAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + REPLY_WINDOW_HOURS * 60 * 60 * 1000);
}

type DeadlineFields = {
  status: LeadStatus;
  replyDueAt: Date;
  firstContactedAt: Date | null;
};

/**
 * Overdue: past the reply deadline with no first contact, while still New or
 * Contacted (Planning/README.md sections 4.2 and 5.3).
 */
export function isOverdue(lead: DeadlineFields, now: Date = new Date()): boolean {
  return (
    lead.firstContactedAt === null &&
    lead.replyDueAt.getTime() < now.getTime() &&
    (AWAITING_REPLY_STATUSES as readonly LeadStatus[]).includes(lead.status)
  );
}

/** The same rule as isOverdue, as a Prisma filter. */
export function overdueWhere(now: Date = new Date()): Prisma.LeadWhereInput {
  return {
    firstContactedAt: null,
    replyDueAt: { lt: now },
    status: { in: [...AWAITING_REPLY_STATUSES] },
  };
}
