import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import { addDays, parseManilaDate } from '@/shared/lib/manila-time';
import { db } from '@/shared/server/db';
import { isOverdue, overdueWhere } from '../deadlines';
import type { LeadSort } from '../options';
import type { LeadListQuery } from '../schema';
import { personSelect, type Actor } from './types';

const ORDER_BY: Record<LeadSort, Prisma.LeadOrderByWithRelationInput[]> = {
  createdAt_desc: [{ createdAt: 'desc' }, { id: 'desc' }],
  createdAt_asc: [{ createdAt: 'asc' }, { id: 'asc' }],
  replyDueAt_asc: [{ replyDueAt: 'asc' }, { id: 'asc' }],
  replyDueAt_desc: [{ replyDueAt: 'desc' }, { id: 'desc' }],
  status_asc: [{ status: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
  status_desc: [{ status: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
};

const listSelect = {
  id: true,
  fullName: true,
  workEmail: true,
  organization: true,
  topic: true,
  status: true,
  interestAreas: true,
  createdAt: true,
  replyDueAt: true,
  firstContactedAt: true,
  deletedAt: true,
  owner: { select: personSelect },
} satisfies Prisma.LeadSelect;

type ListRow = Prisma.LeadGetPayload<{ select: typeof listSelect }>;
export type LeadListItem = ListRow & { overdue: boolean };

export type LeadListPage = {
  items: LeadListItem[];
  total: number;
  overdueTotal: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** Translates list filters into a Prisma filter. All values stay parameterized. */
export function buildLeadWhere(
  query: Omit<LeadListQuery, 'page' | 'pageSize' | 'sort'>,
  viewer: Actor,
  now: Date,
): Prisma.LeadWhereInput {
  const conditions: Prisma.LeadWhereInput[] = [];

  conditions.push({ deletedAt: query.deleted && viewer.role === 'ADMIN' ? { not: null } : null });
  if (query.status) conditions.push({ status: query.status });
  if (query.topic) conditions.push({ topic: query.topic });
  if (query.interest) conditions.push({ interestAreas: { has: query.interest } });
  if (query.ownerId === 'me') conditions.push({ ownerId: viewer.id });
  else if (query.ownerId === 'unassigned') conditions.push({ ownerId: null });
  else if (query.ownerId) conditions.push({ ownerId: query.ownerId });

  const from = query.from ? parseManilaDate(query.from) : null;
  const to = query.to ? parseManilaDate(query.to) : null;
  if (from) conditions.push({ createdAt: { gte: from } });
  if (to) conditions.push({ createdAt: { lt: addDays(to, 1) } });

  if (query.q) {
    // Prisma passes `contains` to ILIKE without escaping, so "%" or "_" in a
    // search would act as wildcards. Postgres uses backslash as the escape.
    const term = query.q.replace(/[\\%_]/g, (char) => `\\${char}`);
    const contains = { contains: term, mode: 'insensitive' } as const;
    conditions.push({
      OR: [{ fullName: contains }, { workEmail: contains }, { organization: contains }],
    });
  }
  if (query.overdue) conditions.push(overdueWhere(now));

  return { AND: conditions };
}

/**
 * One page of enquiries. Overdue enquiries always come first (Planning/README.md
 * section 4.2), then the rest in the chosen order. The two groups are fetched
 * separately and stitched together, because Prisma cannot sort by a computed
 * condition.
 */
export async function listLeads(
  query: LeadListQuery,
  viewer: Actor,
  now = new Date(),
): Promise<LeadListPage> {
  const where = buildLeadWhere(query, viewer, now);
  const overdue: Prisma.LeadWhereInput = { AND: [where, overdueWhere(now)] };
  const rest: Prisma.LeadWhereInput = { AND: [where, { NOT: overdueWhere(now) }] };
  const orderBy = ORDER_BY[query.sort];
  // Deleted leads are never overdue, so skip that split when listing them.
  const splitOverdue = !query.deleted;

  const [total, overdueTotal] = await Promise.all([
    db.lead.count({ where }),
    splitOverdue ? db.lead.count({ where: overdue }) : Promise.resolve(0),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const skip = (query.page - 1) * query.pageSize;
  const take = query.pageSize;

  let rows: ListRow[];
  if (!splitOverdue) {
    rows = await db.lead.findMany({ where, orderBy, skip, take, select: listSelect });
  } else {
    const overdueSlice =
      skip < overdueTotal
        ? await db.lead.findMany({ where: overdue, orderBy, skip, take, select: listSelect })
        : [];
    const remaining = take - overdueSlice.length;
    const restSlice =
      remaining > 0
        ? await db.lead.findMany({
            where: rest,
            orderBy,
            skip: Math.max(0, skip - overdueTotal),
            take: remaining,
            select: listSelect,
          })
        : [];
    rows = [...overdueSlice, ...restSlice];
  }

  return {
    items: rows.map((row) => ({ ...row, overdue: !row.deletedAt && isOverdue(row, now) })),
    total,
    overdueTotal,
    page: query.page,
    pageSize: query.pageSize,
    pageCount,
  };
}

/** Active staff, for the owner selector and the owner filter. */
export function listAssignableUsers() {
  return db.user.findMany({
    where: { active: true },
    orderBy: [{ name: 'asc' }, { email: 'asc' }],
    select: personSelect,
  });
}
