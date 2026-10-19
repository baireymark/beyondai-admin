import 'server-only';

import type { Role } from '@/generated/prisma/enums';
import { fail, ok, type Result } from '@/shared/lib/result';
import { db } from '@/shared/server/db';
import type { AddUserInput, UpdateUserInput } from '../schema';

export type StaffAccount = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  active: boolean;
  createdAt: Date;
  lastSignInAt: Date | null;
};

const accountSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
  lastSignInAt: true,
} as const;

type Actor = { id: string };
type UserError = 'not_found' | 'validation_failed' | 'forbidden';

export function listUsers(): Promise<StaffAccount[]> {
  return db.user.findMany({
    orderBy: [{ active: 'desc' }, { role: 'asc' }, { name: 'asc' }, { email: 'asc' }],
    select: accountSelect,
  });
}

/** Adds an email to the allowlist. The person can then request a sign-in link. */
export async function addUser(input: AddUserInput): Promise<Result<StaffAccount, UserError>> {
  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) return fail('validation_failed', { email: 'This email already has access' });
  try {
    return ok(await db.user.create({ data: input, select: accountSelect }));
  } catch (error) {
    // Two admins adding the same email at once.
    if ((error as { code?: string }).code === 'P2002') {
      return fail('validation_failed', { email: 'This email already has access' });
    }
    throw error;
  }
}

/**
 * Changes a staff account. Admins cannot change their own role or deactivate
 * themselves, so there is always at least one active admin. Deactivating an
 * account ends its sessions at once.
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: Actor,
): Promise<Result<StaffAccount, UserError>> {
  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return fail('not_found');
  if (id === actor.id && (input.role !== undefined || input.active === false)) {
    return fail('forbidden', { _form: 'You cannot change your own role or deactivate yourself.' });
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id }, data: input, select: accountSelect });
    if (input.active === false) await tx.session.deleteMany({ where: { userId: id } });
    return ok(updated);
  });
}
