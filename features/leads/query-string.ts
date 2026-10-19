import type { LeadSort } from './options';

/** Parsed list query, as produced by leadListQuerySchema (no Zod import here). */
export type LeadListParams = {
  status?: string;
  topic?: string;
  ownerId?: string;
  interest?: string;
  overdue: boolean;
  from?: string;
  to?: string;
  q?: string;
  deleted: boolean;
  page: number;
  pageSize: number;
  sort: LeadSort;
};

const DEFAULTS = { page: 1, pageSize: 25, sort: 'createdAt_desc' } as const;

/** Query string for the list, leaving out default values so URLs stay short. */
export function leadListSearch(params: LeadListParams, overrides: Partial<LeadListParams> = {}) {
  const merged = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const key of ['status', 'topic', 'ownerId', 'interest', 'from', 'to', 'q'] as const) {
    const value = merged[key];
    if (value) search.set(key, value);
  }
  if (merged.overdue) search.set('overdue', 'true');
  if (merged.deleted) search.set('deleted', 'true');
  if (merged.sort !== DEFAULTS.sort) search.set('sort', merged.sort);
  if (merged.pageSize !== DEFAULTS.pageSize) search.set('pageSize', String(merged.pageSize));
  if (merged.page !== DEFAULTS.page) search.set('page', String(merged.page));
  const value = search.toString();
  return value ? `?${value}` : '';
}

/** True when any filter other than paging or sorting is set. */
export function hasActiveFilters(params: LeadListParams): boolean {
  return Boolean(
    params.status ||
    params.topic ||
    params.ownerId ||
    params.interest ||
    params.from ||
    params.to ||
    params.q ||
    params.overdue ||
    params.deleted,
  );
}
