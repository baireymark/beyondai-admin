'use client';

import { useActionState } from 'react';

import { Button, FormStatus, TextField } from '@/shared/ui';
import { requestSignInLink } from '../actions';
import { initialLoginState } from '../state';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(requestSignInLink, initialLoginState);

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <TextField
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        required
        aria-invalid={state.status === 'error' ? true : undefined}
      />
      <Button type="submit" loading={pending} className="w-full">
        Email me a sign-in link
      </Button>
      <FormStatus state={state} />
    </form>
  );
}
