'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/features/auth/server';
import { failureState, type FormState } from '@/shared/lib/form-state';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { addUserSchema, updateUserSchema, type UpdateUserInput } from './schema';
import { addUser, updateUser } from './server/users';

export async function addUserAction(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const input = addUserSchema.safeParse({
    email: formData.get('email'),
    name: formData.get('name'),
    role: formData.get('role') || undefined,
  });
  if (!input.success) {
    return {
      status: 'error',
      message: 'Please fix the highlighted fields.',
      fieldErrors: toFieldErrors(input.error),
    };
  }

  const result = await addUser(input.data);
  if (!result.ok) return failureState(result);
  revalidatePath('/settings/users');
  return {
    status: 'success',
    message: `${result.value.email} can now request a sign-in link.`,
  };
}

const INTENTS: Record<string, UpdateUserInput> = {
  'make-admin': { role: 'ADMIN' },
  'make-staff': { role: 'STAFF' },
  activate: { active: true },
  deactivate: { active: false },
};

export async function updateUserAction(
  userId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const intent = INTENTS[String(formData.get('intent'))];
  const input = updateUserSchema.safeParse(intent ?? {});
  if (!input.success) return { status: 'error', message: 'Unknown change.' };

  const result = await updateUser(userId, input.data, admin);
  if (!result.ok) return failureState(result);
  revalidatePath('/settings/users');
  revalidatePath('/leads');
  return { status: 'success', message: 'Saved.' };
}
