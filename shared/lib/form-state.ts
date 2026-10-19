import type { Failure } from './result';

/** State returned by Server Actions that back a form (used with useActionState). */
export type FormState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> };

export const idleFormState: FormState = { status: 'idle' };

const FAILURE_MESSAGES: Record<string, string> = {
  not_found: 'This record no longer exists.',
  deleted: 'This enquiry is deleted. An admin must restore it first.',
  not_deleted: 'This enquiry is not deleted.',
  validation_failed: 'Please fix the highlighted fields.',
  forbidden: 'You do not have permission to do that.',
};

export function failureState(failure: Failure): FormState {
  const formMessage = failure.fields?._form;
  return {
    status: 'error',
    message: formMessage ?? FAILURE_MESSAGES[failure.error] ?? 'Something went wrong.',
    fieldErrors: failure.fields,
  };
}

export function fieldError(state: FormState, field: string): string | undefined {
  return state.status === 'error' ? state.fieldErrors?.[field] : undefined;
}
