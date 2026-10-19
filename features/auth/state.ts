// Kept apart from actions.ts so the client form can import its initial state
// without pulling server code into the browser bundle.

export type LoginState =
  { status: 'idle' } | { status: 'sent'; message: string } | { status: 'error'; message: string };

export const initialLoginState: LoginState = { status: 'idle' };

/** The same message for every email, so the page never reveals who has access. */
export const LINK_SENT_MESSAGE =
  'If this email has access, a sign-in link is on its way. It expires in 15 minutes.';
