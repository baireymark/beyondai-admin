'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin, requireUser } from '@/features/auth/server';
import { failureState, type FormState } from '@/shared/lib/form-state';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { leadUpdateSchema, noteSchema } from './schema';
import { restoreLead, softDeleteLead } from './server/delete-lead';
import { addNote } from './server/notes';
import { updateLead } from './server/update-lead';

// Server Actions behind the dashboard forms. Each one checks the session and
// role itself and calls the same functions as the /api/admin route handlers.

function refreshLeadViews(leadId: string): void {
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
  // The layout shows the New and overdue counts on every page.
  revalidatePath('/', 'layout');
}

function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === 'string' ? value : undefined;
}

export async function updateLeadAction(
  leadId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const owner = text(formData, 'ownerId');
  const input = leadUpdateSchema.safeParse({
    status: text(formData, 'status') || undefined,
    ownerId: owner === undefined ? undefined : owner || null,
    reason: text(formData, 'reason'),
  });
  if (!input.success) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: toFieldErrors(input.error),
    };
  }

  const result = await updateLead(leadId, input.data, user);
  if (!result.ok) return failureState(result);
  refreshLeadViews(leadId);
  return { status: 'success', message: result.value.changed ? 'Saved.' : 'Nothing to change.' };
}

export async function addNoteAction(
  leadId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const input = noteSchema.safeParse({ body: text(formData, 'body') });
  if (!input.success) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: toFieldErrors(input.error),
    };
  }

  const result = await addNote(leadId, input.data.body, user);
  if (!result.ok) return failureState(result);
  refreshLeadViews(leadId);
  return { status: 'success', message: 'Note added.' };
}

export async function deleteLeadAction(leadId: string, _previous: FormState): Promise<FormState> {
  const user = await requireAdmin();
  const result = await softDeleteLead(leadId, user);
  if (!result.ok) return failureState(result);
  refreshLeadViews(leadId);
  return { status: 'success', message: 'Enquiry deleted. Staff can no longer see it.' };
}

export async function restoreLeadAction(leadId: string, _previous: FormState): Promise<FormState> {
  const user = await requireAdmin();
  const result = await restoreLead(leadId, user);
  if (!result.ok) return failureState(result);
  refreshLeadViews(leadId);
  return { status: 'success', message: 'Enquiry restored.' };
}
