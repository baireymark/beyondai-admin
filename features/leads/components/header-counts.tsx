'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';

import { Badge } from '@/shared/ui';
import { leadKeys, useHeaderCounts, type HeaderCountsResponse } from '../api';

/**
 * The New and overdue counts shown on every page. The layout renders the
 * first value; the browser refreshes it every minute so new arrivals show up
 * without a reload.
 */
export function HeaderCounts({ initial }: { initial: HeaderCountsResponse }) {
  const queryClient = useQueryClient();
  const { data } = useHeaderCounts(initial);

  // A Server Action that changed a lead re-renders the layout with fresh counts.
  useEffect(() => {
    queryClient.setQueryData(leadKeys.headerCounts, initial);
  }, [initial, queryClient]);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Enquiry counts">
      <Link href="/leads?status=NEW" className="rounded-full">
        <Badge tone="primary">{data.newCount} new</Badge>
      </Link>
      {data.overdueCount > 0 ? (
        <Link href="/leads?overdue=true" className="rounded-full">
          <Badge tone="danger">
            <span aria-hidden="true" className="mr-1">
              !
            </span>
            {data.overdueCount} overdue
          </Badge>
        </Link>
      ) : null}
    </div>
  );
}
