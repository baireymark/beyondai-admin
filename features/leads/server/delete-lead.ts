import 'server-only';

import { fail, ok, type Result } from '@/shared/lib/result';
import { db } from '@/shared/server/db';
import type { Actor, LeadError } from './types';

/** Soft delete: hides the lead from staff and blocks edits. Admins only. */
export async function softDeleteLead(
  id: string,
  actor: Actor,
  now = new Date(),
): Promise<Result<{ id: string; deletedAt: Date }, LeadError>> {
  return db.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!lead) return fail('not_found');
    if (lead.deletedAt) return fail('deleted');

    await tx.lead.update({ where: { id }, data: { deletedAt: now } });
    await tx.leadActivity.create({
      data: { leadId: id, actorId: actor.id, action: 'deleted', createdAt: now },
    });
    return ok({ id, deletedAt: now });
  });
}

/** Undoes a soft delete. Admins only. */
export async function restoreLead(
  id: string,
  actor: Actor,
  now = new Date(),
): Promise<Result<{ id: string }, LeadError>> {
  return db.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!lead) return fail('not_found');
    if (!lead.deletedAt) return fail('not_deleted');

    await tx.lead.update({ where: { id }, data: { deletedAt: null } });
    await tx.leadActivity.create({
      data: { leadId: id, actorId: actor.id, action: 'restored', createdAt: now },
    });
    return ok({ id });
  });
}
