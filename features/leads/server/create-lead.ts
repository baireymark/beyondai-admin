import 'server-only';

import { db } from '@/shared/server/db';
import { replyDueAt } from '../deadlines';
import type { EnquiryInput } from '../schema';

export type CreatedLead = { id: string; status: 'NEW'; replyDueAt: Date };

/**
 * Saves an enquiry with status New and a reply deadline 24 hours out, and
 * logs its creation. Consent is recorded at the moment of saving.
 */
export async function createLead(input: EnquiryInput, now = new Date()): Promise<CreatedLead> {
  return db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        fullName: input.fullName,
        workEmail: input.workEmail,
        organization: input.organization,
        topic: input.topic,
        interestAreas: input.interestAreas,
        preferredCallTime: input.preferredCallTime,
        message: input.message,
        consentAt: now,
        consentVersion: input.consentVersion,
        sourcePage: input.sourcePage,
        utmSource: input.utm?.source ?? null,
        utmMedium: input.utm?.medium ?? null,
        utmCampaign: input.utm?.campaign ?? null,
        createdAt: now,
        replyDueAt: replyDueAt(now),
      },
      select: { id: true, replyDueAt: true },
    });
    await tx.leadActivity.create({
      data: { leadId: lead.id, action: 'created', detail: { topic: input.topic }, createdAt: now },
    });
    return { id: lead.id, status: 'NEW', replyDueAt: lead.replyDueAt };
  });
}
