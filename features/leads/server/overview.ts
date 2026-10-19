import 'server-only';

import type { Topic } from '@/generated/prisma/enums';
import { addDays, startOfManilaDay, startOfManilaWeek } from '@/shared/lib/manila-time';
import { db } from '@/shared/server/db';
import { overdueWhere } from '../deadlines';
import { TOPICS } from '../options';

export type Overview = {
  newToday: number;
  newThisWeek: number;
  overdue: number;
  last30Days: {
    total: number;
    won: number;
    /** Share of enquiries created in the window that are now Won, from 0 to 1. */
    conversionRate: number;
    byTopic: { topic: Topic; count: number }[];
  };
};

const active = { deletedAt: null };

/** Numbers for the overview page. "Today" and "this week" use Manila time. */
export async function getOverview(now = new Date()): Promise<Overview> {
  const since30 = addDays(now, -30);
  const [newToday, newThisWeek, overdue, total, won, grouped] = await Promise.all([
    db.lead.count({ where: { ...active, createdAt: { gte: startOfManilaDay(now) } } }),
    db.lead.count({ where: { ...active, createdAt: { gte: startOfManilaWeek(now) } } }),
    db.lead.count({ where: { ...active, ...overdueWhere(now) } }),
    db.lead.count({ where: { ...active, createdAt: { gte: since30 } } }),
    db.lead.count({ where: { ...active, createdAt: { gte: since30 }, status: 'WON' } }),
    db.lead.groupBy({
      by: ['topic'],
      where: { ...active, createdAt: { gte: since30 } },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(grouped.map((group) => [group.topic, group._count._all]));
  return {
    newToday,
    newThisWeek,
    overdue,
    last30Days: {
      total,
      won,
      conversionRate: total === 0 ? 0 : won / total,
      byTopic: TOPICS.map(({ value }) => ({ topic: value, count: counts.get(value) ?? 0 })),
    },
  };
}

export type HeaderCounts = { newCount: number; overdueCount: number };

/** The counts shown in the header on every page. */
export async function getHeaderCounts(now = new Date()): Promise<HeaderCounts> {
  const [newCount, overdueCount] = await Promise.all([
    db.lead.count({ where: { ...active, status: 'NEW' } }),
    db.lead.count({ where: { ...active, ...overdueWhere(now) } }),
  ]);
  return { newCount, overdueCount };
}
