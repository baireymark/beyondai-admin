'use client';

import { useActionState } from 'react';

import { Button, buttonClassName, Card, Notice, TextField } from '@/shared/ui';
import { erasePersonAction, lookupPersonAction } from '../actions';
import { ERASE_CONFIRMATION, initialPrivacyState } from '../state';

/**
 * Data subject requests (Planning/README.md section 13.4): look up a person
 * by email, download everything stored about them, or delete it for good.
 */
export function PrivacyTools() {
  const [lookup, lookupAction, looking] = useActionState(lookupPersonAction, initialPrivacyState);
  const [erase, eraseAction, erasing] = useActionState(erasePersonAction, initialPrivacyState);
  const found = lookup.status === 'found' && erase.status !== 'erased' ? lookup : null;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold">Find a person</h2>
        <form action={lookupAction} className="mt-4 flex flex-wrap items-end gap-3" noValidate>
          <TextField
            label="Email address"
            name="email"
            type="email"
            autoComplete="off"
            required
            className="min-w-64 flex-1"
            error={lookup.status === 'error' ? lookup.message : undefined}
          />
          <Button type="submit" loading={looking}>
            Look up
          </Button>
        </form>
        <p role="status" className="mt-3 text-sm">
          {found
            ? `${found.count} ${found.count === 1 ? 'enquiry' : 'enquiries'} found, including deleted ones.`
            : ''}
        </p>
      </Card>

      {found && found.count > 0 ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold">Export their data</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Downloads every enquiry, note, and history entry for this email as JSON.
            </p>
            {/* A plain POST keeps the email out of the URL and the request logs. */}
            <form method="post" action="/api/admin/privacy/export" className="mt-4">
              <input type="hidden" name="email" value={found.email} />
              <button type="submit" className={buttonClassName({ variant: 'secondary' })}>
                Download JSON
              </button>
            </form>
          </Card>

          <Card className="border-danger/40">
            <h2 className="text-lg font-semibold">Delete their data permanently</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Removes the {found.count === 1 ? 'enquiry' : 'enquiries'} with all notes and history.
              This cannot be undone. The privacy log keeps only the count and who did it.
            </p>
            <form action={eraseAction} className="mt-4 flex flex-wrap items-end gap-3" noValidate>
              <input type="hidden" name="email" value={found.email} />
              <TextField
                label={`Type ${ERASE_CONFIRMATION} to confirm`}
                name="confirm"
                autoComplete="off"
                required
                className="min-w-48"
                error={erase.status === 'error' ? erase.message : undefined}
              />
              <Button type="submit" variant="danger" loading={erasing}>
                Delete permanently
              </Button>
            </form>
          </Card>
        </>
      ) : null}

      {erase.status === 'erased' ? (
        <Notice tone="success" title="Deleted">
          <p role="status">{erase.message}</p>
        </Notice>
      ) : null}
    </div>
  );
}
