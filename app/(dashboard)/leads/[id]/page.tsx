import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireUser } from '@/features/auth/server';
import {
  ActivityList,
  ConsentCard,
  DeleteLeadButton,
  LeadContactCard,
  LeadMessageCard,
  LeadStatusForm,
  NoteForm,
  NotesList,
  OverdueBadge,
  RestoreLeadButton,
  StatusBadge,
} from '@/features/leads';
import { getLead, listAssignableUsers } from '@/features/leads/server';
import { formatManila } from '@/shared/lib/manila-time';
import { Card, Notice } from '@/shared/ui';

export const metadata: Metadata = { title: 'Enquiry' };

export default async function LeadPage({ params }: PageProps<'/leads/[id]'>) {
  const user = await requireUser();
  const { id } = await params;
  const [lead, people] = await Promise.all([getLead(id, user), listAssignableUsers()]);
  if (!lead) notFound();

  const isAdmin = user.role === 'ADMIN';
  const deleted = lead.deletedAt !== null;

  return (
    <main id="main" className="space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link href="/leads" className="text-sm text-primary hover:underline">
          ← All enquiries
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold break-words">{lead.fullName}</h1>
          <StatusBadge status={lead.status} />
          {lead.overdue ? <OverdueBadge /> : null}
        </div>
        <p className="mt-1 text-sm text-fg-muted">
          {lead.organization ? `${lead.organization} · ` : ''}Received{' '}
          {formatManila(lead.createdAt)}
        </p>
      </div>

      {deleted ? (
        <Notice tone="warning" title="This enquiry is deleted">
          <p>
            Deleted {formatManila(lead.deletedAt!)}. Staff cannot see it, and it cannot be edited
            until it is restored. It is removed for good 30 days after deletion.
          </p>
          <div className="mt-3">
            <RestoreLeadButton leadId={lead.id} />
          </div>
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <LeadMessageCard message={lead.message} />
          <LeadContactCard lead={lead} />
          <Card>
            <h2 className="text-lg font-semibold">Notes</h2>
            <div className="mt-4 space-y-6">
              <NoteForm leadId={lead.id} disabled={deleted} />
              <NotesList notes={lead.notes} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold">Status and owner</h2>
            <div className="mt-4">
              <LeadStatusForm
                leadId={lead.id}
                status={lead.status}
                ownerId={lead.ownerId}
                people={people}
                disabled={deleted}
              />
            </div>
          </Card>
          <ConsentCard lead={lead} />
          <Card>
            <h2 className="text-lg font-semibold">Activity</h2>
            <div className="mt-4">
              <ActivityList lead={lead} />
            </div>
          </Card>
          {isAdmin && !deleted ? (
            <Card>
              <h2 className="text-lg font-semibold">Admin</h2>
              <div className="mt-4">
                <DeleteLeadButton leadId={lead.id} />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </main>
  );
}
