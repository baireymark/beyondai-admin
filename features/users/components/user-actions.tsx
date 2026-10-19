'use client';

import { useActionState } from 'react';

import { idleFormState } from '@/shared/lib/form-state';
import { Button, FormStatus } from '@/shared/ui';
import { updateUserAction } from '../actions';

/** Role and access buttons for one account. Admins cannot change their own. */
export function UserActions({
  userId,
  label,
  role,
  active,
}: {
  userId: string;
  label: string;
  role: 'STAFF' | 'ADMIN';
  active: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateUserAction.bind(null, userId),
    idleFormState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <Button
        type="submit"
        name="intent"
        value={role === 'ADMIN' ? 'make-staff' : 'make-admin'}
        variant="secondary"
        size="sm"
        disabled={pending || !active}
        aria-label={`${role === 'ADMIN' ? 'Make staff' : 'Make admin'}: ${label}`}
      >
        {role === 'ADMIN' ? 'Make staff' : 'Make admin'}
      </Button>
      <Button
        type="submit"
        name="intent"
        value={active ? 'deactivate' : 'activate'}
        variant={active ? 'ghost' : 'secondary'}
        size="sm"
        disabled={pending}
        aria-label={`${active ? 'Deactivate' : 'Activate'}: ${label}`}
      >
        {active ? 'Deactivate' : 'Activate'}
      </Button>
      {state.status === 'error' ? <FormStatus state={state} /> : null}
    </form>
  );
}
