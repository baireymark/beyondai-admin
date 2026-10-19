import { z } from 'zod';

import { Role } from '@/generated/prisma/enums';

/** Body of POST /api/admin/users: adds an email to the allowlist. */
export const addUserSchema = z.strictObject({
  email: z
    .string({ error: 'Enter a valid email address' })
    .trim()
    .toLowerCase()
    .max(254, 'Use 254 characters or fewer')
    .pipe(z.email('Enter a valid email address')),
  name: z
    .string({ error: 'Enter a name' })
    .trim()
    .min(1, 'Enter a name')
    .max(120, 'Use 120 characters or fewer'),
  role: z.enum(Role, { error: 'Choose a role' }).default('STAFF'),
});

export type AddUserInput = z.output<typeof addUserSchema>;

/** Body of PATCH /api/admin/users/[id]. */
export const updateUserSchema = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(1, 'Enter a name')
      .max(120, 'Use 120 characters or fewer')
      .optional(),
    role: z.enum(Role, { error: 'Choose a role' }).optional(),
    active: z.boolean({ error: 'Use true or false' }).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Change the name, role, or status',
    path: ['_form'],
  });

export type UpdateUserInput = z.output<typeof updateUserSchema>;
