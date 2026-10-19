import type { Role } from '@/generated/prisma/enums';

/** The signed-in staff member performing an action. */
export type Actor = { id: string; role: Role };

/** Errors a lead operation can return. */
export type LeadError = 'not_found' | 'deleted' | 'not_deleted' | 'validation_failed';

export const personSelect = { id: true, name: true, email: true } as const;
export type Person = { id: string; name: string | null; email: string };
