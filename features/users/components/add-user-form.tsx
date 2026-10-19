'use client';

import { useActionState, useEffect, useRef } from 'react';

import { fieldError, idleFormState } from '@/shared/lib/form-state';
import { Button, FormStatus, SelectField, TextField } from '@/shared/ui';
import { addUserAction } from '../actions';

const ROLES = [
  { value: 'STAFF', label: 'Staff' },
  { value: 'ADMIN', label: 'Admin' },
];

export function AddUserForm() {
  const [state, formAction, pending] = useActionState(addUserAction, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
        <TextField
          label="Work email"
          name="email"
          type="email"
          autoComplete="off"
          required
          error={fieldError(state, 'email')}
        />
        <TextField label="Name" name="name" required error={fieldError(state, 'name')} />
        <SelectField label="Role" name="role" options={ROLES} defaultValue="STAFF" />
      </div>
      <Button type="submit" loading={pending}>
        Give access
      </Button>
      <FormStatus state={state} />
    </form>
  );
}
