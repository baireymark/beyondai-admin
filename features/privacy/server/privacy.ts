import 'server-only';

import { addDays } from '@/shared/lib/manila-time';
import { db } from '@/shared/server/db';

/**
 * Retention periods from Planning/README.md section 13.3. They are
 * placeholders until the business confirms them.
 */
export const RETENTION = {
  /** Soft-deleted leads are removed for good after this many days. */
  softDeletedDays: 30,
  /** Won and Lost leads are removed this many days after their last update. */
  closedLeadDays: 2 * 365,
} as const;

type Actor = { id: string };

function byEmail(email: string) {
  return { workEmail: { equals: email.trim(), mode: 'insensitive' as const } };
}

/** How many enquiries, including deleted ones, belong to this email. */
export function countPersonLeads(email: string): Promise<number> {
  return db.lead.count({ where: byEmail(email) });
}

/**
 * Everything stored about one person, for a data subject access request.
 * The export itself is logged with a count only, never the email.
 */
export async function exportPersonData(email: string, actor: Actor, now = new Date()) {
  const leads = await db.lead.findMany({
    where: byEmail(email),
    orderBy: { createdAt: 'asc' },
    include: {
      notes: { orderBy: { createdAt: 'asc' }, select: { body: true, createdAt: true } },
      activity: {
        orderBy: { createdAt: 'asc' },
        select: { action: true, detail: true, createdAt: true },
      },
    },
  });
  await db.privacyLog.create({
    data: { action: 'EXPORT', recordCount: leads.length, actorId: actor.id, createdAt: now },
  });
  return { exportedAt: now.toISOString(), leadCount: leads.length, leads };
}

/**
 * Permanently deletes a person's enquiries with their notes and activity
 * (the foreign keys cascade). Writes a log entry with no personal data.
 */
export async function erasePersonData(email: string, actor: Actor, now = new Date()) {
  return db.$transaction(async (tx) => {
    const { count } = await tx.lead.deleteMany({ where: byEmail(email) });
    await tx.privacyLog.create({
      data: { action: 'ERASURE', recordCount: count, actorId: actor.id, createdAt: now },
    });
    return { deleted: count };
  });
}

/** Scheduled job: removes leads past their retention period. */
export async function runRetention(now = new Date()) {
  return db.$transaction(async (tx) => {
    const softDeleted = await tx.lead.deleteMany({
      where: { deletedAt: { lt: addDays(now, -RETENTION.softDeletedDays) } },
    });
    const closed = await tx.lead.deleteMany({
      where: {
        status: { in: ['WON', 'LOST'] },
        updatedAt: { lt: addDays(now, -RETENTION.closedLeadDays) },
      },
    });
    const total = softDeleted.count + closed.count;
    await tx.privacyLog.create({
      data: { action: 'RETENTION_PURGE', recordCount: total, createdAt: now },
    });
    return { softDeleted: softDeleted.count, closed: closed.count };
  });
}

/** Recent privacy operations, for the admin privacy page. */
export function listPrivacyLog(take = 20) {
  return db.privacyLog.findMany({ orderBy: { createdAt: 'desc' }, take });
}
