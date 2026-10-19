'use server';

import { AuthError } from 'next-auth';
import { headers } from 'next/headers';
import { z } from 'zod';

import { serverEnv } from '@/config/env';
import { clientIp, hashIdentifier } from '@/shared/server/client-ip';
import { logger } from '@/shared/server/logger';
import { createRateLimiter, type RateLimiter } from '@/shared/server/rate-limit';
import { signIn, signOut } from './auth';
import { LINK_SENT_MESSAGE, type LoginState } from './state';

const emailSchema = z.string().trim().max(254).pipe(z.email());

// 5 link requests per 15 minutes per IP, so the form cannot be used to flood
// inboxes. Created on first use so importing this module never reads the env.
let loginLimiter: RateLimiter | undefined;

/** Only same-site paths, so the link cannot redirect anywhere else after sign-in. */
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/';
}

export async function requestSignInLink(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = emailSchema.safeParse(formData.get('email'));
  if (!email.success) return { status: 'error', message: 'Enter a valid email address.' };

  const env = serverEnv();
  const ip = clientIp(await headers()) ?? 'unknown';
  loginLimiter ??= createRateLimiter({ name: 'login', limit: 5, windowSeconds: 15 * 60 });
  const limit = await loginLimiter.limit(hashIdentifier(ip, env.AUTH_SECRET, 'login'));
  if (!limit.success) {
    return { status: 'error', message: 'Too many attempts. Try again in a few minutes.' };
  }

  try {
    await signIn('email', {
      email: email.data,
      redirect: false,
      redirectTo: safeCallbackUrl(formData.get('callbackUrl')),
    });
  } catch (error) {
    // AccessDenied means the email is not on the allowlist or is inactive.
    // Answer exactly as for a valid email.
    if (!(error instanceof AuthError && error.type === 'AccessDenied')) {
      logger.error('sign_in_link_failed', {}, error);
      return { status: 'error', message: 'We could not send a sign-in link. Try again shortly.' };
    }
  }
  return { status: 'sent', message: LINK_SENT_MESSAGE };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
