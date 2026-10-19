import Link from 'next/link';
import Form from 'next/form';

import { buttonClassName, CheckboxField, SelectField, TextField } from '@/shared/ui';
import { INTEREST_AREAS, LEAD_STATUSES, TOPICS } from '../options';
import { hasActiveFilters, type LeadListParams } from '../query-string';
import type { Person } from '../server/types';

/**
 * Filters as a plain GET form, so the filtered view is a shareable URL and
 * works without JavaScript. Applying filters returns to page 1.
 */
export function LeadFilters({
  query,
  people,
  isAdmin,
}: {
  query: LeadListParams;
  people: Person[];
  isAdmin: boolean;
}) {
  const ownerOptions = [
    { value: 'me', label: 'Me' },
    { value: 'unassigned', label: 'Unassigned' },
    ...people.map((person) => ({ value: person.id, label: person.name ?? person.email })),
  ];

  return (
    <Form
      action="/leads"
      role="search"
      aria-label="Filter enquiries"
      className="rounded-card border border-border bg-surface p-4"
    >
      <input type="hidden" name="sort" value={query.sort} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Search"
          name="q"
          type="search"
          defaultValue={query.q}
          placeholder="Name, email, or organization"
          className="sm:col-span-2"
        />
        <SelectField
          label="Status"
          name="status"
          options={LEAD_STATUSES}
          placeholder="Any status"
          defaultValue={query.status ?? ''}
        />
        <SelectField
          label="Topic"
          name="topic"
          options={TOPICS}
          placeholder="Any topic"
          defaultValue={query.topic ?? ''}
        />
        <SelectField
          label="Owner"
          name="ownerId"
          options={ownerOptions}
          placeholder="Anyone"
          defaultValue={query.ownerId ?? ''}
        />
        <SelectField
          label="Area of interest"
          name="interest"
          options={INTEREST_AREAS}
          placeholder="Any area"
          defaultValue={query.interest ?? ''}
        />
        <TextField label="Created from" name="from" type="date" defaultValue={query.from} />
        <TextField label="Created to" name="to" type="date" defaultValue={query.to} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <CheckboxField
          label="Overdue only"
          name="overdue"
          value="true"
          defaultChecked={query.overdue}
        />
        {isAdmin ? (
          <CheckboxField
            label="Show deleted"
            name="deleted"
            value="true"
            defaultChecked={query.deleted}
          />
        ) : null}
        <div className="ml-auto flex gap-2">
          {hasActiveFilters(query) ? (
            <Link href="/leads" className={buttonClassName({ variant: 'ghost' })}>
              Clear filters
            </Link>
          ) : null}
          <button type="submit" className={buttonClassName()}>
            Apply filters
          </button>
        </div>
      </div>
    </Form>
  );
}
