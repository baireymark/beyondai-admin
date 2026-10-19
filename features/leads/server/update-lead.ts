import 'server-only';

import type { Prisma } from '@/generated/prisma/client';
import type { LeadStatus } from '@/generated/prisma/enums';
import { fail, ok, type Result } from '@/shared/lib/result';
import { db } from '@/shared/server/db';
import { CLOSING_STATUSES } from '../options';
import type { LeadUpdateInput } from '../schema';
import type { Actor, LeadError } from './types';

export type UpdatedLead = {
  id: string;
  status: LeadStatus;
  ownerId: string | null;
  firstContactedAt: Date | null;
  changed: boolean;
};

/**
 * Changes a lead's status or owner and writes one activity row per change in
 * the same transaction (Planning/README.md section 5.2):
 *
 * - Moving to Contacted sets firstContactedAt if it is empty.
 * - Moving to Won or Lost needs a short reason, which is saved as a note.
 * - Deleted leads cannot be changed until an admin restores them.
 */
export async function updateLead(
  id: string,
  input: LeadUpdateInput,
  actor: Actor,
  now = new Date(),
): Promise<Result<UpdatedLead, LeadError>> {
  return db.$transaction(async (tx) => {
    // Lock the row so two simultaneous edits log accurate before-and-after values.
    await tx.$queryRaw`SELECT id FROM "Lead" WHERE id = ${id} FOR UPDATE`;
    const lead = await tx.lead.findUnique({
      where: { id },
      select: { id: true, status: true, ownerId: true, firstContactedAt: true, deletedAt: true },
    });
    if (!lead) return fail('not_found');
    if (lead.deletedAt) return fail('deleted');

    const statusChanged = input.status !== undefined && input.status !== lead.status;
    const ownerChanged = input.ownerId !== undefined && input.ownerId !== lead.ownerId;

    if (statusChanged && CLOSING_STATUSES.includes(input.status!) && !input.reason) {
      return fail('validation_failed', {
        reason: 'Add a short reason when marking an enquiry Won or Lost',
      });
    }
    if (ownerChanged && input.ownerId) {
      const owner = await tx.user.findUnique({
        where: { id: input.ownerId },
        select: { active: true },
      });
      if (!owner?.active)
        return fail('validation_failed', { ownerId: 'Choose an active staff member' });
    }

    if (!statusChanged && !ownerChanged) {
      return ok({ ...lead, changed: false });
    }

    const data: Prisma.LeadUpdateInput = {};
    const activity: Prisma.LeadActivityCreateManyInput[] = [];

    if (statusChanged) {
      data.status = input.status;
      if (input.status === 'CONTACTED' && !lead.firstContactedAt) data.firstContactedAt = now;
      activity.push({
        leadId: id,
        actorId: actor.id,
        action: 'status_changed',
        detail: { from: lead.status, to: input.status! },
        createdAt: now,
      });
    }
    if (ownerChanged) {
      data.owner = input.ownerId ? { connect: { id: input.ownerId } } : { disconnect: true };
      activity.push({
        leadId: id,
        actorId: actor.id,
        action: 'owner_changed',
        detail: { from: lead.ownerId, to: input.ownerId ?? null },
        createdAt: now,
      });
    }
    if (input.reason && statusChanged) {
      const note = await tx.leadNote.create({
        data: { leadId: id, authorId: actor.id, body: input.reason, createdAt: now },
        select: { id: true },
      });
      activity.push({
        leadId: id,
        actorId: actor.id,
        action: 'note_added',
        detail: { noteId: note.id, reasonFor: input.status! },
        createdAt: now,
      });
    }

    const updated = await tx.lead.update({
      where: { id },
      data,
      select: { id: true, status: true, ownerId: true, firstContactedAt: true },
    });
    await tx.leadActivity.createMany({ data: activity });
    return ok({ ...updated, changed: true });
  });
}
