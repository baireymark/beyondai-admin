import { useQuery } from '@tanstack/react-query';
import * as z from 'zod/mini';

import { fetchJson } from '@/shared/api/http';

// zod/mini, because this runs in the browser.
export const headerCountsSchema = z.object({
  newCount: z.number(),
  overdueCount: z.number(),
});

export type HeaderCountsResponse = z.infer<typeof headerCountsSchema>;

export const leadKeys = {
  headerCounts: ['leads', 'header-counts'] as const,
};

const POLL_MS = 60_000;

/** New and overdue counts for the header, refreshed every minute. */
export function useHeaderCounts(initialData: HeaderCountsResponse) {
  return useQuery({
    queryKey: leadKeys.headerCounts,
    queryFn: () => fetchJson('/api/admin/overview?scope=header', headerCountsSchema),
    initialData,
    refetchInterval: POLL_MS,
  });
}
