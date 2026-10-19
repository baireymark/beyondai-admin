'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/features/auth/server';
import { logger } from '@/shared/server/logger';
import { countPersonLeads, erasePersonData } from './server/privacy';
import { ERASE_CONFIRMATION, type PrivacyState } from './state';

const emailSchema = z.string().trim().max(254).pipe(z.email());

export async function lookupPersonAction(
  _previous: PrivacyState,
  formData: FormData,
): Promise<PrivacyState> {
  await requireAdmin();
  const email = emailSchema.safeParse(formData.get('email'));
  if (!email.success) return { status: 'error', message: 'Enter a valid email address.' };
  return { status: 'found', email: email.data, count: await countPersonLeads(email.data) };
}

/** Permanent deletion for a data subject request. Cannot be undone. */
export async function erasePersonAction(
  _previous: PrivacyState,
  formData: FormData,
): Promise<PrivacyState> {
  const admin = await requireAdmin();
  const email = emailSchema.safeParse(formData.get('email'));
  if (!email.success) return { status: 'error', message: 'Enter a valid email address.' };
  if (formData.get('confirm') !== ERASE_CONFIRMATION) {
    return {
      status: 'error',
      message: `Type ${ERASE_CONFIRMATION} to confirm the permanent deletion.`,
    };
  }

  const { deleted } = await erasePersonData(email.data, admin);
  logger.info('privacy_erasure', { actorId: admin.id, deleted });
  revalidatePath('/', 'layout');
  return {
    status: 'erased',
    message: `Permanently deleted ${deleted} ${deleted === 1 ? 'enquiry' : 'enquiries'} with their notes and history.`,
  };
}
