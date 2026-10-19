import type { Route } from 'next';
import Link from 'next/link';

import { formatManila, formatManilaCompact } from '@/shared/lib/manila-time';
import { topicLabel, type LeadSort } from '../options';
import { leadListSearch, type LeadListParams } from '../query-string';
import type { LeadListItem } from '../server/list-leads';
import { OverdueBadge, StatusBadge } from './status-badge';

type SortField = 'createdAt' | 'replyDueAt' | 'status';

function SortHeader({
  field,
  label,
  query,
  defaultDirection,
}: {
  field: SortField;
  label: string;
  query: LeadListParams;
  defaultDirection: 'asc' | 'desc';
}) {
  const [currentField, currentDirection] = query.sort.split('_') as [SortField, 'asc' | 'desc'];
  const active = currentField === field;
  const nextDirection = active ? (currentDirection === 'asc' ? 'desc' : 'asc') : defaultDirection;
  const href = `/leads${leadListSearch(query, { sort: `${field}_${nextDirection}` as LeadSort, page: 1 })}`;

  return (
    <th
      scope="col"
      aria-sort={active ? (currentDirection === 'asc' ? 'ascending' : 'descending') : undefined}
      className="px-3 py-2 font-medium"
    >
      <Link href={href as Route} className="inline-flex items-center gap-1 hover:underline">
        {label}
        <span aria-hidden="true" className="text-fg-muted">
          {active ? (currentDirection === 'asc' ? '↑' : '↓') : '↕'}
        </span>
        <span className="sr-only">
          {active
            ? `, sorted ${currentDirection === 'asc' ? 'ascending' : 'descending'}`
            : ', sort'}
        </span>
      </Link>
    </th>
  );
}

export function LeadTable({ items, query }: { items: LeadListItem[]; query: LeadListParams }) {
  return (
    <div className="relative overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <caption className="sr-only">Enquiries. Overdue enquiries are listed first.</caption>
        <thead className="border-b border-border bg-bg text-xs text-fg-muted uppercase">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Name
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Organization
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Topic
            </th>
            <SortHeader field="status" label="Status" query={query} defaultDirection="asc" />
            <th scope="col" className="px-3 py-2 font-medium">
              Owner
            </th>
            <SortHeader field="createdAt" label="Created" query={query} defaultDirection="desc" />
            <SortHeader field="replyDueAt" label="Reply by" query={query} defaultDirection="asc" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((lead) => (
            <tr key={lead.id} className={lead.overdue ? 'bg-danger/5' : undefined}>
              <td className="px-3 py-2">
                <Link
                  href={`/leads/${lead.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {lead.fullName}
                </Link>
                <div
                  className="max-w-[16rem] truncate text-xs text-fg-muted"
                  title={lead.workEmail}
                >
                  {lead.workEmail}
                </div>
              </td>
              <td className="px-3 py-2">{lead.organization ?? '—'}</td>
              <td className="min-w-[9rem] px-3 py-2">{topicLabel(lead.topic)}</td>
              <td className="px-3 py-2">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-3 py-2">
                {lead.owner ? (
                  (lead.owner.name ?? lead.owner.email)
                ) : (
                  <span className="text-fg-muted">Unassigned</span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                <time dateTime={lead.createdAt.toISOString()} title={formatManila(lead.createdAt)}>
                  {formatManilaCompact(lead.createdAt)}
                </time>
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                <div className="flex flex-col items-start gap-1">
                  <time
                    dateTime={lead.replyDueAt.toISOString()}
                    title={formatManila(lead.replyDueAt)}
                  >
                    {formatManilaCompact(lead.replyDueAt)}
                  </time>
                  {lead.overdue ? <OverdueBadge /> : null}
                  {lead.firstContactedAt ? (
                    <span className="text-xs text-fg-muted">Replied</span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
