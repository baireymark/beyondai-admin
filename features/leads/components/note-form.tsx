'use client';

import { useActionState, useEffect, useRef } from 'react';

import { fieldError, idleFormState } from '@/shared/lib/form-state';
import { Button, FormStatus, TextAreaField } from '@/shared/ui';
import { addNoteAction } from '../actions';

export function NoteForm({ leadId, disabled }: { leadId: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(
    addNoteAction.bind(null, leadId),
    idleFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3" noValidate>
      <TextAreaField
        label="Add a note"
        name="body"
        required
        maxLength={5000}
        disabled={disabled}
        error={fieldError(state, 'body')}
      />
      <Button type="submit" variant="secondary" loading={pending} disabled={disabled}>
        Add note
      </Button>
      <FormStatus state={state} />
    </form>
  );
}
