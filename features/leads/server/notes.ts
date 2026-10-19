import 'server-only';

import { fail, ok, type Result } from '@/shared/lib/result';
import { db } from '@/shared/server/db';
import type { Actor, LeadError } from './types';

export type CreatedNote = { id: string; body: string; createdAt: Date };

export async function addNote(
  leadId: string,
  body: string,
  actor: Actor,
  now = new Date(),
): Promise<Result<CreatedNote, LeadError>> {
  return db.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { deletedAt: true } });
    if (!lead) return fail('not_found');
    if (lead.deletedAt) return fail('deleted');

    const note = await tx.leadNote.create({
      data: { leadId, authorId: actor.id, body, createdAt: now },
      select: { id: true, body: true, createdAt: true },
    });
    await tx.leadActivity.create({
      data: {
        leadId,
        actorId: actor.id,
        action: 'note_added',
        detail: { noteId: note.id },
        createdAt: now,
      },
    });
    // Touch the lead so "last updated" reflects the new note.
    await tx.lead.update({ where: { id: leadId }, data: { updatedAt: now } });
    return ok(note);
  });
}
