import { z } from 'zod';

import { LeadStatus, Topic } from '@/generated/prisma/enums';
import { parseManilaDate } from '@/shared/lib/manila-time';
import { INTEREST_AREA_VALUES, LEAD_SORTS, MAX_INTEREST_AREAS, type LeadSort } from './options';

// Server-side schemas. Classic Zod stays out of the browser bundle, so client
// components import labels from options.ts instead of this file.

/** Treats a blank string as "not provided", then makes the field nullable. */
function optionalField<T extends z.ZodType>(schema: T) {
  return z
    .preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
      schema.nullish(),
    )
    .transform((value) => value ?? null);
}

export const idSchema = z.string().regex(/^[a-z0-9]{1,64}$/i, 'Invalid id');

/**
 * Body of POST /api/leads (Planning/README.md sections 4.1 and 10.1).
 * Unknown fields are rejected. The honeypot (companyUrl) is checked before
 * this schema runs, so bots never learn which field gave them away.
 */
export const enquirySchema = z.strictObject({
  fullName: z
    .string({ error: 'Enter your full name' })
    .trim()
    .min(2, 'Enter your full name')
    .max(120, 'Use 120 characters or fewer'),
  workEmail: z
    .string({ error: 'Enter a valid email address' })
    .trim()
    .max(254, 'Use 254 characters or fewer')
    .pipe(z.email('Enter a valid email address')),
  organization: optionalField(z.string().trim().max(160, 'Use 160 characters or fewer')),
  topic: z.enum(Topic, { error: 'Choose a topic' }),
  interestAreas: z
    .array(z.enum(INTEREST_AREA_VALUES, { error: 'Choose from the listed areas' }), {
      error: 'Choose from the listed areas',
    })
    .max(MAX_INTEREST_AREAS, `Choose up to ${MAX_INTEREST_AREAS} areas`)
    .refine((values) => new Set(values).size === values.length, 'Choose each area once')
    .default([]),
  preferredCallTime: optionalField(
    z.iso.datetime({ offset: true, error: 'Enter a valid date and time' }),
  ).transform((value) => (value ? new Date(value) : null)),
  message: z
    .string({ error: 'Write your message' })
    .trim()
    .min(10, 'Write at least 10 characters')
    .max(2000, 'Use 2,000 characters or fewer'),
  consent: z.literal(true, { error: 'Agree to the privacy notice to continue' }),
  consentVersion: z
    .string({ error: 'Missing privacy notice version' })
    .regex(/^[\w.-]{1,32}$/, 'Missing privacy notice version'),
  turnstileToken: z
    .string({ error: 'Complete the verification' })
    .min(1, 'Complete the verification')
    .max(2048, 'Complete the verification'),
  companyUrl: z.string().max(2048).optional(),
  sourcePage: optionalField(
    z.string().trim().max(200, 'Use 200 characters or fewer').startsWith('/', 'Use a page path'),
  ),
  utm: optionalField(
    z.strictObject({
      source: optionalField(z.string().trim().max(100, 'Use 100 characters or fewer')),
      medium: optionalField(z.string().trim().max(100, 'Use 100 characters or fewer')),
      campaign: optionalField(z.string().trim().max(100, 'Use 100 characters or fewer')),
    }),
  ),
});

export type EnquiryInput = z.output<typeof enquirySchema>;

/** Body of PATCH /api/admin/leads/[id]. */
export const leadUpdateSchema = z
  .strictObject({
    status: z.enum(LeadStatus, { error: 'Choose a status' }).optional(),
    ownerId: idSchema.nullable().optional(),
    reason: z
      .string()
      .trim()
      .max(500, 'Use 500 characters or fewer')
      .optional()
      .transform((value) => value || undefined),
  })
  .refine((value) => value.status !== undefined || value.ownerId !== undefined, {
    message: 'Change the status or the owner',
    path: ['status'],
  });

export type LeadUpdateInput = z.output<typeof leadUpdateSchema>;

/** Body of POST /api/admin/leads/[id]/notes. */
export const noteSchema = z.strictObject({
  body: z
    .string({ error: 'Write a note' })
    .trim()
    .min(1, 'Write a note')
    .max(5000, 'Use 5,000 characters or fewer'),
});

const LEAD_SORT_VALUES = LEAD_SORTS.map((sort) => sort.value) as [LeadSort, ...LeadSort[]];
const calendarDate = z.string().refine((value) => parseManilaDate(value) !== null, {
  message: 'Use YYYY-MM-DD',
});

/** Query of GET /api/admin/leads and the enquiry list page. */
export const leadListQuerySchema = z.object({
  status: z.enum(LeadStatus).optional(),
  topic: z.enum(Topic).optional(),
  /** A user id, or "me", or "unassigned". */
  ownerId: idSchema.optional(),
  interest: z.enum(INTEREST_AREA_VALUES).optional(),
  overdue: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  q: z.string().trim().max(100).optional(),
  /** Admins only: list soft-deleted enquiries instead of active ones. */
  deleted: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(LEAD_SORT_VALUES).default('createdAt_desc'),
});

export type LeadListQuery = z.output<typeof leadListQuerySchema>;
export type QueryRecord = Record<string, string | string[] | undefined>;

/** First value of each parameter, with blank values dropped. */
export function toQueryRecord(source: URLSearchParams | QueryRecord): Record<string, string> {
  const entries =
    source instanceof URLSearchParams
      ? [...source.keys()].map((key) => [key, source.get(key)] as const)
      : Object.entries(source).map(
          ([key, value]) => [key, Array.isArray(value) ? value[0] : value] as const,
        );
  return Object.fromEntries(
    entries.filter((entry): entry is readonly [string, string] => Boolean(entry[1]?.trim())),
  );
}

/** For the UI: drops any parameter that fails validation instead of failing. */
export function parseLeadListQueryLenient(source: URLSearchParams | QueryRecord): LeadListQuery {
  const record = toQueryRecord(source);
  const first = leadListQuerySchema.safeParse(record);
  if (first.success) return first.data;
  const invalid = new Set(first.error.issues.map((issue) => String(issue.path[0])));
  const cleaned = Object.fromEntries(Object.entries(record).filter(([key]) => !invalid.has(key)));
  return leadListQuerySchema.safeParse(cleaned).data ?? leadListQuerySchema.parse({});
}
