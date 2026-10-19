import 'server-only';

import { z } from 'zod';

import { logger } from './logger';

export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const responseSchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).default([]),
});

export type TurnstileResult = { ok: true } | { ok: false; reason: 'rejected' | 'unavailable' };

/**
 * Verifies a Turnstile token with Cloudflare. Tokens are single-use, so a
 * replayed token comes back as rejected. A network failure or timeout is
 * reported separately so the caller can ask the visitor to retry instead of
 * treating them as a bot.
 */
export async function verifyTurnstile(
  token: string,
  options: { secret: string; remoteIp?: string | null },
): Promise<TurnstileResult> {
  const form = new URLSearchParams({ secret: options.secret, response: token });
  if (options.remoteIp) form.set('remoteip', options.remoteIp);

  let payload: unknown;
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      logger.warn('turnstile_unavailable', { status: response.status });
      return { ok: false, reason: 'unavailable' };
    }
    payload = await response.json();
  } catch (error) {
    logger.warn('turnstile_unavailable', { error });
    return { ok: false, reason: 'unavailable' };
  }

  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success) {
    logger.warn('turnstile_unexpected_response');
    return { ok: false, reason: 'unavailable' };
  }
  if (!parsed.data.success) {
    logger.info('turnstile_rejected', { codes: parsed.data['error-codes'] });
    return { ok: false, reason: 'rejected' };
  }
  return { ok: true };
}
