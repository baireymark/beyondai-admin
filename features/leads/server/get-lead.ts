import 'server-only';

import { db } from '@/shared/server/db';
import { isOverdue } from '../deadlines';
import { personSelect, type Actor, type Person } from './types';

/**
 * A lead with its notes and activity, newest first. Staff never see deleted
 * leads; admins do, so they can restore them.
 */
export async function getLead(id: string, viewer: Actor, now = new Date()) {
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      owner: { select: personSelect },
      notes: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, body: true, createdAt: true, author: { select: personSelect } },
      },
      activity: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          action: true,
          detail: true,
          createdAt: true,
          actor: { select: personSelect },
        },
      },
    },
  });
  if (!lead) return null;
  if (lead.deletedAt && viewer.role !== 'ADMIN') return null;

  // Owner changes store user ids; resolve them so the history shows names.
  const ownerIds = new Set<string>();
  for (const entry of lead.activity) {
    if (entry.action !== 'owner_changed') continue;
    const detail = entry.detail as { from?: string | null; to?: string | null } | null;
    if (detail?.from) ownerIds.add(detail.from);
    if (detail?.to) ownerIds.add(detail.to);
  }
  const people: Person[] = ownerIds.size
    ? await db.user.findMany({ where: { id: { in: [...ownerIds] } }, select: personSelect })
    : [];

  return {
    ...lead,
    overdue: !lead.deletedAt && isOverdue(lead, now),
    people: Object.fromEntries(people.map((person) => [person.id, person])) as Record<
      string,
      Person
    >,
  };
}

export type LeadDetail = NonNullable<Awaited<ReturnType<typeof getLead>>>;
