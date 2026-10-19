'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import type { LeadStatus } from '@/generated/prisma/enums';
import { fieldError, idleFormState } from '@/shared/lib/form-state';
import { Button, FormStatus, SelectField, TextAreaField } from '@/shared/ui';
import { updateLeadAction } from '../actions';
import { CLOSING_STATUSES, LEAD_STATUSES } from '../options';
import type { Person } from '../server/types';

export function LeadStatusForm({
  leadId,
  status,
  ownerId,
  people,
  disabled,
}: {
  leadId: string;
  status: LeadStatus;
  ownerId: string | null;
  people: Person[];
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateLeadAction.bind(null, leadId),
    idleFormState,
  );
  const [selected, setSelected] = useState<LeadStatus>(status);
  const statusRef = useRef<HTMLSelectElement>(null);
  const needsReason = selected !== status && CLOSING_STATUSES.includes(selected);

  // The select is uncontrolled, so a choice made before hydration survives;
  // pick it up once React takes over.
  useEffect(() => {
    if (statusRef.current) setSelected(statusRef.current.value as LeadStatus);
  }, [status]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <SelectField
        ref={statusRef}
        label="Status"
        name="status"
        options={LEAD_STATUSES}
        defaultValue={status}
        onChange={(event) => setSelected(event.target.value as LeadStatus)}
        disabled={disabled}
        error={fieldError(state, 'status')}
      />
      <SelectField
        label="Owner"
        name="ownerId"
        options={people.map((person) => ({ value: person.id, label: person.name ?? person.email }))}
        placeholder="Unassigned"
        defaultValue={ownerId ?? ''}
        disabled={disabled}
        error={fieldError(state, 'ownerId')}
      />
      {needsReason ? (
        <TextAreaField
          label={`Reason for marking ${selected === 'WON' ? 'Won' : 'Lost'}`}
          name="reason"
          required
          maxLength={500}
          hint="Saved as a note on this enquiry."
          error={fieldError(state, 'reason')}
        />
      ) : null}
      <Button type="submit" loading={pending} disabled={disabled}>
        Save changes
      </Button>
      <FormStatus state={state} />
    </form>
  );
}
