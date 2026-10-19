import type { Metadata } from 'next';

import { requireAdmin } from '@/features/auth/server';
import { PrivacyTools } from '@/features/privacy';
import { listPrivacyLog, RETENTION } from '@/features/privacy/server';
import { formatManila } from '@/shared/lib/manila-time';
import { Card } from '@/shared/ui';

export const metadata: Metadata = { title: 'Privacy' };

const ACTION_LABELS = {
  EXPORT: 'Data export',
  ERASURE: 'Permanent deletion',
  RETENTION_PURGE: 'Retention clean-up',
} as const;

export default async function PrivacyPage() {
  await requireAdmin();
  const log = await listPrivacyLog();

  return (
    <main id="main" className="space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold">Privacy</h1>
        <p className="mt-1 max-w-prose text-sm text-fg-muted">
          Handle requests from people who want a copy of their data or want it deleted. Soft-deleted
          enquiries are removed after {RETENTION.softDeletedDays} days, and Won or Lost enquiries{' '}
          {Math.round(RETENTION.closedLeadDays / 365)} years after their last update.
        </p>
      </div>

      <PrivacyTools />

      <Card>
        <h2 className="text-lg font-semibold">Privacy log</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Records each request without the personal data involved.
        </p>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-fg-muted">Nothing recorded yet.</p>
        ) : (
          <div className="relative mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="border-b border-border text-xs text-fg-muted uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    When
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Action
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Enquiries
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {log.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                      {formatManila(entry.createdAt)}
                    </td>
                    <td className="py-2 pr-3">{ACTION_LABELS[entry.action]}</td>
                    <td className="py-2 tabular-nums">{entry.recordCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  );
}
