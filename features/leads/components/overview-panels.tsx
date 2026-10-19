import Link from 'next/link';
import type { ReactNode } from 'react';

import { Card } from '@/shared/ui';
import { topicLabel } from '../options';
import type { Overview } from '../server/overview';

function StatTile({
  label,
  value,
  detail,
  href,
  alert,
}: {
  label: string;
  value: string;
  detail?: ReactNode;
  href?: '/leads?overdue=true' | '/leads';
  alert?: boolean;
}) {
  const body = (
    <>
      <p className="text-sm text-fg-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-sm text-fg-muted">{detail}</p> : null}
    </>
  );
  return (
    <Card className={alert ? 'border-danger/40' : undefined}>
      {href ? (
        <Link href={href} className="block rounded-lg hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

const percent = new Intl.NumberFormat('en-PH', { style: 'percent', maximumFractionDigits: 1 });

export function OverviewTiles({ overview }: { overview: Overview }) {
  const { last30Days } = overview;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="New today" value={String(overview.newToday)} detail="Manila time" />
      <StatTile label="New this week" value={String(overview.newThisWeek)} detail="Since Monday" />
      <StatTile
        label="Overdue"
        value={String(overview.overdue)}
        href="/leads?overdue=true"
        alert={overview.overdue > 0}
        detail={
          overview.overdue > 0 ? (
            <span className="font-medium text-danger">
              <span aria-hidden="true">! </span>Past the 24-hour reply window
            </span>
          ) : (
            'Every enquiry answered on time'
          )
        }
      />
      <StatTile
        label="New to Won, last 30 days"
        value={percent.format(last30Days.conversionRate)}
        detail={`${last30Days.won} of ${last30Days.total} enquiries`}
      />
    </div>
  );
}

/**
 * Horizontal bars, one series, sorted by count. Each row carries its topic
 * and count as text, so the list is also the table view and identity never
 * depends on color. Bars use SVG attributes, not inline styles, which the
 * Content Security Policy would block.
 */
export function TopicBreakdown({ byTopic }: { byTopic: Overview['last30Days']['byTopic'] }) {
  const rows = [...byTopic].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card>
      <h2 id="topic-breakdown" className="text-lg font-semibold">
        Enquiries by topic, last 30 days
      </h2>
      <ul aria-labelledby="topic-breakdown" className="mt-4 space-y-2">
        {rows.map((row) => {
          const width = (row.count / max) * 100;
          return (
            <li
              key={row.topic}
              // The whole row is the hover target, not just the 12px bar.
              title={`${topicLabel(row.topic)}: ${row.count}`}
              className="grid grid-cols-[minmax(0,14rem)_1fr_2.5rem] items-center gap-3 rounded py-1 text-sm hover:bg-bg"
            >
              <span className="truncate">{topicLabel(row.topic)}</span>
              <svg
                className="h-3 w-full overflow-visible border-l border-border"
                aria-hidden="true"
                focusable="false"
              >
                {row.count > 0 ? (
                  <>
                    {/* Rounded data end, square at the baseline. */}
                    <rect
                      x="0"
                      y="0"
                      height="12"
                      width={`${width}%`}
                      rx="4"
                      className="fill-chart"
                    />
                    <rect x="0" y="0" height="12" width={`${width / 2}%`} className="fill-chart" />
                  </>
                ) : null}
              </svg>
              <span className="text-right font-medium tabular-nums">{row.count}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
