export type PrivacyState =
  | { status: 'idle' }
  | { status: 'found'; email: string; count: number }
  | { status: 'erased'; message: string }
  | { status: 'error'; message: string };

export const initialPrivacyState: PrivacyState = { status: 'idle' };

/** Typed by the admin to confirm a permanent deletion. */
export const ERASE_CONFIRMATION = 'DELETE';
