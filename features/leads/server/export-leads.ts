import 'server-only';

import { toCsv, type CsvValue } from '@/shared/lib/csv';
import { db } from '@/shared/server/db';
import { isOverdue } from '../deadlines';
import { interestLabel, statusLabel, topicLabel } from '../options';
import type { LeadListQuery } from '../schema';
import { buildLeadWhere } from './list-leads';
import type { Actor } from './types';

/** Upper bound on one export, so a request cannot exhaust server memory. */
export const EXPORT_ROW_LIMIT = 10_000;

export const EXPORT_COLUMNS = [
  'id',
  'created_at',
  'full_name',
  'work_email',
  'organization',
  'topic',
  'interest_areas',
  'preferred_call_time',
  'message',
  'status',
  'owner',
  'reply_due_at',
  'first_contacted_at',
  'overdue',
  'source_page',
  'utm_source',
  'utm_medium',
  'utm_campaign',
] as const;

/**
 * CSV of the filtered list. Admins export any view. Staff export only the
 * enquiries assigned to them, because they may not export all leads
 * (Planning/README.md section 12.2).
 */
export async function exportLeadsCsv(
  query: LeadListQuery,
  viewer: Actor,
  now = new Date(),
): Promise<{ csv: string; rowCount: number; truncated: boolean }> {
  const filters = viewer.role === 'ADMIN' ? query : { ...query, ownerId: 'me', deleted: false };
  const where = buildLeadWhere(filters, viewer, now);

  const leads = await db.lead.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: EXPORT_ROW_LIMIT + 1,
    include: { owner: { select: { email: true } } },
  });
  const truncated = leads.length > EXPORT_ROW_LIMIT;
  const rows = truncated ? leads.slice(0, EXPORT_ROW_LIMIT) : leads;

  const body: CsvValue[][] = rows.map((lead) => [
    lead.id,
    lead.createdAt,
    lead.fullName,
    lead.workEmail,
    lead.organization,
    topicLabel(lead.topic),
    lead.interestAreas.map(interestLabel).join('; '),
    lead.preferredCallTime,
    lead.message,
    statusLabel(lead.status),
    lead.owner?.email,
    lead.replyDueAt,
    lead.firstContactedAt,
    !lead.deletedAt && isOverdue(lead, now),
    lead.sourcePage,
    lead.utmSource,
    lead.utmMedium,
    lead.utmCampaign,
  ]);

  return { csv: toCsv([[...EXPORT_COLUMNS], ...body]), rowCount: rows.length, truncated };
}
