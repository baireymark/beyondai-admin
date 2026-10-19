'use client';

import { useActionState, useState } from 'react';

import { idleFormState } from '@/shared/lib/form-state';
import { Button, FormStatus } from '@/shared/ui';
import { deleteLeadAction, restoreLeadAction } from '../actions';

/** Soft delete with a confirmation step. Rendered for admins only. */
export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteLeadAction.bind(null, leadId),
    idleFormState,
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="space-y-2">
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Delete enquiry
        </Button>
        <FormStatus state={state} />
      </div>
    );
  }
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-danger/30 p-3">
      <p className="text-sm">
        Delete this enquiry? Staff will no longer see it, and it is removed for good after 30 days
        unless an admin restores it.
      </p>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" loading={pending}>
          Delete
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
      <FormStatus state={state} />
    </form>
  );
}

export function RestoreLeadButton({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(
    restoreLeadAction.bind(null, leadId),
    idleFormState,
  );
  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="secondary" loading={pending}>
        Restore enquiry
      </Button>
      <FormStatus state={state} />
    </form>
  );
}
