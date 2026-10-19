// @vitest-environment node
import { AccessDenied } from '@auth/core/errors';

import { requestSignInLink } from './actions';
import { signIn } from './auth';
import { initialLoginState, LINK_SENT_MESSAGE } from './state';

vi.mock('./auth', () => ({ signIn: vi.fn(), signOut: vi.fn() }));
vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve(
      new Headers({ 'x-forwarded-for': `192.0.2.${Math.floor(Math.random() * 250)}` }),
    ),
}));

function form(email: string, callbackUrl = '/leads'): FormData {
  const data = new FormData();
  data.set('email', email);
  data.set('callbackUrl', callbackUrl);
  return data;
}

describe('requestSignInLink', () => {
  // A block body: a function returned from beforeEach runs as a teardown.
  beforeEach(() => {
    vi.mocked(signIn).mockReset();
  });

  it('sends a link for an allowlisted email', async () => {
    vi.mocked(signIn).mockResolvedValue('/login');
    const state = await requestSignInLink(initialLoginState, form('staff@beyondai.ph'));
    expect(state).toEqual({ status: 'sent', message: LINK_SENT_MESSAGE });
    expect(signIn).toHaveBeenCalledWith('email', {
      email: 'staff@beyondai.ph',
      redirect: false,
      redirectTo: '/leads',
    });
  });

  it('answers exactly the same for an email without access', async () => {
    vi.mocked(signIn).mockRejectedValue(new AccessDenied('AccessDenied'));
    const state = await requestSignInLink(initialLoginState, form('stranger@example.com'));
    expect(state).toEqual({ status: 'sent', message: LINK_SENT_MESSAGE });
  });

  it('never redirects to another site after sign-in', async () => {
    vi.mocked(signIn).mockResolvedValue('/login');
    await requestSignInLink(initialLoginState, form('staff@beyondai.ph', '//evil.example'));
    expect(vi.mocked(signIn).mock.calls[0]?.[1]).toMatchObject({ redirectTo: '/' });
  });

  it('rejects a malformed email without calling Auth.js', async () => {
    const state = await requestSignInLink(initialLoginState, form('not-an-email'));
    expect(state.status).toBe('error');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('reports a sending failure without revealing anything else', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(signIn).mockRejectedValue(new Error('SMTP down'));
    const state = await requestSignInLink(initialLoginState, form('staff@beyondai.ph'));
    expect(state).toEqual({
      status: 'error',
      message: 'We could not send a sign-in link. Try again shortly.',
    });
  });
});
