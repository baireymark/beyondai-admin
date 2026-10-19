import type { LeadStatus, Topic } from '@/generated/prisma/enums';

// UI labels for every enum, shared by the public form contract and the
// dashboard so both use the same wording (Planning/README.md section 9.1).
// This file has no Zod import so client components can use it.

export const TOPICS = [
  { value: 'BOOK_CONSULTATION', label: 'Book a consultation' },
  { value: 'PRODUCT_DEMO', label: 'Product demo' },
  { value: 'AI_EDUCATION', label: 'AI Education course enquiry' },
  { value: 'CORPORATE_TRAINING', label: 'Corporate or team AI training' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'TECHNICAL_SUPPORT', label: 'Technical support' },
  { value: 'OTHER', label: 'Something else' },
] as const satisfies readonly { value: Topic; label: string }[];

export const INTEREST_AREAS = [
  { value: 'NOT_SURE', label: 'Not sure yet' },
  { value: 'CLOUD_MODERNIZATION', label: 'Cloud Modernization' },
  { value: 'AI_ANALYTICS', label: 'AI & Analytics' },
  { value: 'CYBERSECURITY_COMPLIANCE', label: 'Cybersecurity & Compliance' },
  { value: 'SOFTWARE_DEVELOPMENT', label: 'Software Development' },
  { value: 'MANAGED_SERVICES', label: 'Managed Services' },
  { value: 'RESOURCE_AUGMENTATION', label: 'Resource Augmentation' },
  { value: 'HRM_SOFTWARE', label: 'HRM Software' },
  { value: 'ERP', label: 'ERP' },
  { value: 'COUNT_TRUST', label: 'Count Trust' },
  { value: 'TALKORA_AI', label: 'Talkora AI' },
  { value: 'AGENTIC_AI', label: 'Agentic AI' },
  { value: 'AI_EDUCATION', label: 'AI Education' },
] as const;

export type InterestArea = (typeof INTEREST_AREAS)[number]['value'];
export const INTEREST_AREA_VALUES = INTEREST_AREAS.map((area) => area.value) as [
  InterestArea,
  ...InterestArea[],
];
export const MAX_INTEREST_AREAS = 5;

export const LEAD_STATUSES = [
  { value: 'NEW', label: 'New', description: 'Saved, not yet reviewed by anyone' },
  { value: 'CONTACTED', label: 'Contacted', description: 'A staff member has replied' },
  { value: 'QUALIFIED', label: 'Qualified', description: 'A real opportunity with a clear need' },
  { value: 'WON', label: 'Won', description: 'The engagement or sale is agreed' },
  { value: 'LOST', label: 'Lost', description: 'Not pursued, no fit, or no response' },
] as const satisfies readonly { value: LeadStatus; label: string; description: string }[];

/** Statuses that close an enquiry and need a short reason. */
export const CLOSING_STATUSES: readonly LeadStatus[] = ['WON', 'LOST'];

export const LEAD_SORTS = [
  { value: 'createdAt_desc', label: 'Newest first' },
  { value: 'createdAt_asc', label: 'Oldest first' },
  { value: 'replyDueAt_asc', label: 'Reply deadline, soonest first' },
  { value: 'replyDueAt_desc', label: 'Reply deadline, latest first' },
  { value: 'status_asc', label: 'Status, New to Lost' },
  { value: 'status_desc', label: 'Status, Lost to New' },
] as const;

export type LeadSort = (typeof LEAD_SORTS)[number]['value'];

function labelFrom(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

export const topicLabel = (value: string) => labelFrom(TOPICS, value);
export const interestLabel = (value: string) => labelFrom(INTEREST_AREAS, value);
export const statusLabel = (value: string) => labelFrom(LEAD_STATUSES, value);
