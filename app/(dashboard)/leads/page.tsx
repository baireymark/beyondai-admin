import type { Metadata } from 'next';
import Link from 'next/link';

import { requireUser } from '@/features/auth/server';
import { LeadFilters, LeadTable, leadListSearch, Pagination } from '@/features/leads';
import { listAssignableUsers, listLeads, parseLeadListQueryLenient } from '@/features/leads/server';
import { buttonClassName, Card } from '@/shared/ui';

export const metadata: Metadata = { title: 'Enquiries' };

export default async function LeadsPage({ searchParams }: PageProps<'/leads'>) {
  const user = await requireUser();
  const query = parseLeadListQueryLenient(await searchParams);
  const [page, people] = await Promise.all([listLeads(query, user), listAssignableUsers()]);
  const isAdmin = user.role === 'ADMIN';

  const title = query.deleted
    ? 'Deleted enquiries'
    : query.ownerId === 'me'
      ? 'My enquiries'
      : 'Enquiries';
  const exportHref = `/api/admin/leads/export${leadListSearch(query, { page: 1 })}`;

  return (
    <main id="main" className="space-y-4 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <a href={exportHref} className={buttonClassName({ variant: 'secondary' })} download>
          {isAdmin ? 'Export CSV' : 'Export my enquiries (CSV)'}
        </a>
      </div>

      <LeadFilters query={query} people={people} isAdmin={isAdmin} />

      {page.items.length > 0 ? (
        <>
          <LeadTable items={page.items} query={query} />
          <Pagination query={query} total={page.total} pageCount={page.pageCount} />
        </>
      ) : (
        <Card className="text-center">
          <p className="font-medium">No enquiries match these filters.</p>
          <Link href="/leads" className="mt-2 inline-block text-sm text-primary underline">
            Show all enquiries
          </Link>
        </Card>
      )}
    </main>
  );
}
