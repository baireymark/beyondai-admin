import { formatManila } from '@/shared/lib/manila-time';
import { Card, LocalTime } from '@/shared/ui';
import { interestLabel, statusLabel, topicLabel } from '../options';
import type { LeadDetail } from '../server/get-lead';
import type { Person } from '../server/types';

function personLabel(person: Person | null | undefined): string {
  if (!person) return 'Unassigned';
  return person.name ?? person.email;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

export function LeadContactCard({ lead }: { lead: LeadDetail }) {
  const utm = [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ');
  return (
    <Card>
      <h2 className="text-lg font-semibold">Contact</h2>
      <dl className="mt-2 divide-y divide-border">
        <Row label="Email">
          <a href={`mailto:${lead.workEmail}`} className="text-primary underline">
            {lead.workEmail}
          </a>
        </Row>
        <Row label="Organization">{lead.organization ?? '—'}</Row>
        <Row label="Topic">{topicLabel(lead.topic)}</Row>
        <Row label="Areas of interest">
          {lead.interestAreas.length ? lead.interestAreas.map(interestLabel).join(', ') : '—'}
        </Row>
        <Row label="Preferred call time">
          {lead.preferredCallTime ? (
            <span className="flex flex-col">
              <span>{formatManila(lead.preferredCallTime)} (Manila)</span>
              <LocalTime date={lead.preferredCallTime.toISOString()} className="text-fg-muted" />
            </span>
          ) : (
            '—'
          )}
        </Row>
        <Row label="Received">{formatManila(lead.createdAt)}</Row>
        <Row label="Reply by">{formatManila(lead.replyDueAt)}</Row>
        <Row label="First contact">
          {lead.firstContactedAt ? formatManila(lead.firstContactedAt) : 'Not yet'}
        </Row>
        <Row label="Submitted from">{lead.sourcePage ?? '—'}</Row>
        {utm ? <Row label="Campaign">{utm}</Row> : null}
      </dl>
    </Card>
  );
}

/** Visitor text is rendered as plain text only, never as HTML. */
export function LeadMessageCard({ message }: { message: string }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Message</h2>
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
    </Card>
  );
}

export function ConsentCard({ lead }: { lead: LeadDetail }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Consent</h2>
      <dl className="mt-2 divide-y divide-border">
        <Row label="Given">{formatManila(lead.consentAt)}</Row>
        <Row label="Notice version">{lead.consentVersion}</Row>
      </dl>
    </Card>
  );
}

export function NotesList({ notes }: { notes: LeadDetail['notes'] }) {
  if (notes.length === 0) return <p className="text-sm text-fg-muted">No notes yet.</p>;
  return (
    <ol className="space-y-4">
      {notes.map((note) => (
        <li key={note.id} className="rounded-lg border border-border p-3">
          <p className="text-sm whitespace-pre-wrap">{note.body}</p>
          <p className="mt-2 text-xs text-fg-muted">
            {personLabel(note.author)} ·{' '}
            <time dateTime={note.createdAt.toISOString()}>{formatManila(note.createdAt)}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}

type Detail = { from?: string | null; to?: string | null; reasonFor?: string } | null;

function describe(entry: LeadDetail['activity'][number], people: LeadDetail['people']): string {
  const detail = entry.detail as Detail;
  switch (entry.action) {
    case 'created':
      return 'Enquiry received from the website';
    case 'status_changed':
      return `Changed status from ${statusLabel(detail?.from ?? '')} to ${statusLabel(detail?.to ?? '')}`;
    case 'owner_changed': {
      const from = detail?.from ? personLabel(people[detail.from]) : 'Unassigned';
      const to = detail?.to ? personLabel(people[detail.to]) : 'Unassigned';
      return `Changed owner from ${from} to ${to}`;
    }
    case 'note_added':
      return detail?.reasonFor
        ? `Added the reason for ${statusLabel(detail.reasonFor)}`
        : 'Added a note';
    case 'deleted':
      return 'Deleted the enquiry';
    case 'restored':
      return 'Restored the enquiry';
  }
}

export function ActivityList({ lead }: { lead: LeadDetail }) {
  return (
    <ol className="space-y-3 border-l border-border pl-4">
      {lead.activity.map((entry) => (
        <li key={entry.id} className="text-sm">
          {/* Entries without an actor, such as the website creating the lead, read as plain sentences. */}
          <p>
            {entry.actor ? (
              <>
                <span className="font-medium">{personLabel(entry.actor)}</span>{' '}
                {describe(entry, lead.people).replace(/^./, (char) => char.toLowerCase())}
              </>
            ) : (
              describe(entry, lead.people)
            )}
          </p>
          <p className="text-xs text-fg-muted">
            <time dateTime={entry.createdAt.toISOString()}>{formatManila(entry.createdAt)}</time>
          </p>
        </li>
      ))}
    </ol>
  );
}
