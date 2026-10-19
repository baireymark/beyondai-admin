import type { Route } from 'next';
import Link from 'next/link';

import { buttonClassName } from '@/shared/ui';
import { leadListSearch, type LeadListParams } from '../query-string';

export function Pagination({
  query,
  total,
  pageCount,
}: {
  query: LeadListParams;
  total: number;
  pageCount: number;
}) {
  const first = total === 0 ? 0 : (query.page - 1) * query.pageSize + 1;
  const last = Math.min(total, query.page * query.pageSize);
  const pageHref = (page: number) => `/leads${leadListSearch(query, { page })}` as Route;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-fg-muted">
        Showing <span className="font-medium text-fg">{first}</span>–
        <span className="font-medium text-fg">{last}</span> of{' '}
        <span className="font-medium text-fg">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {query.page > 1 ? (
          <Link
            href={pageHref(query.page - 1)}
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            Previous
          </Link>
        ) : null}
        <span className="text-fg-muted">
          Page {Math.min(query.page, pageCount)} of {pageCount}
        </span>
        {query.page < pageCount ? (
          <Link
            href={pageHref(query.page + 1)}
            className={buttonClassName({ variant: 'secondary', size: 'sm' })}
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
