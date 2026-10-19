import type { Metadata } from 'next';

import { requireUser } from '@/features/auth/server';
import { OverviewTiles, TopicBreakdown } from '@/features/leads';
import { getOverview } from '@/features/leads/server';

export const metadata: Metadata = { title: 'Overview' };

export default async function OverviewPage() {
  await requireUser();
  const overview = await getOverview();

  return (
    <main id="main" className="space-y-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <OverviewTiles overview={overview} />
      <TopicBreakdown byTopic={overview.last30Days.byTopic} />
    </main>
  );
}
