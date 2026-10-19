import 'server-only';

import { randomBytes } from 'node:crypto';

import { serverEnv } from '@/config/env';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { clientIp, hashIdentifier } from '@/shared/server/client-ip';
import { corsHeaders, isAllowedOrigin } from '@/shared/server/cors';
import { jsonError, NO_STORE, readJsonBody } from '@/shared/server/http';
import { logger } from '@/shared/server/logger';
import {
  checkRateLimits,
  createRateLimiter,
  retryAfterSeconds,
  type RateLimiter,
} from '@/shared/server/rate-limit';
import { verifyTurnstile } from '@/shared/server/turnstile';
import { replyDueAt } from '../deadlines';
import { enquirySchema } from '../schema';
import { createLead } from './create-lead';

export const ENQUIRY_BODY_LIMIT_BYTES = 16 * 1024;

// Per IP: 5 submissions per 10 minutes, and 20 per day (Planning/README.md 12.1).
let limiters: RateLimiter[] | undefined;
function enquiryLimiters(): RateLimiter[] {
  limiters ??= [
    createRateLimiter({ name: 'enquiry-10m', limit: 5, windowSeconds: 10 * 60 }),
    createRateLimiter({ name: 'enquiry-day', limit: 20, windowSeconds: 24 * 60 * 60 }),
  ];
  return limiters;
}

/** Looks like a real cuid, so a bot cannot tell the honeypot answered. */
function fakeLeadId(): string {
  return `c${Array.from(randomBytes(24), (byte) => (byte % 36).toString(36)).join('')}`;
}

function honeypotFilled(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const field = (value as Record<string, unknown>).companyUrl;
  return typeof field === 'string' && field.trim() !== '';
}

/**
 * POST /api/leads. The order of checks matters:
 *
 * 1. Origin allowlist, before anything else.
 * 2. Body size, so oversized requests cost nothing.
 * 3. Rate limit per hashed IP.
 * 4. Honeypot: a filled field gets a fake success and nothing is saved.
 * 5. Validation, before Turnstile, so a typo does not burn the visitor's
 *    single-use token.
 * 6. Turnstile, then save.
 */
export async function submitEnquiry(request: Request): Promise<Response> {
  const env = serverEnv();
  const origin = request.headers.get('origin');
  if (!isAllowedOrigin(origin, env.CORS_ALLOWED_ORIGINS)) {
    return jsonError(403, 'verification_failed');
  }

  const cors = corsHeaders(origin);
  const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    Response.json(body, { status, headers: { ...NO_STORE, ...cors, ...headers } });

  const body = await readJsonBody(request, ENQUIRY_BODY_LIMIT_BYTES);
  if (!body.ok && body.reason === 'too_large') return respond(413, { error: 'payload_too_large' });

  const ip = clientIp(request.headers);
  const limit = await checkRateLimits(
    enquiryLimiters(),
    hashIdentifier(ip ?? 'unknown', env.AUTH_SECRET, 'enquiry'),
  );
  if (!limit.success) {
    logger.info('enquiry_rate_limited');
    return respond(
      429,
      { error: 'rate_limited' },
      { 'Retry-After': retryAfterSeconds(limit.resetAt) },
    );
  }

  if (!body.ok) {
    return respond(400, { error: 'validation_failed', fields: { _form: 'Send a JSON body' } });
  }

  if (honeypotFilled(body.value)) {
    logger.info('enquiry_honeypot_filled');
    return respond(201, {
      id: fakeLeadId(),
      status: 'NEW',
      replyDueAt: replyDueAt(new Date()).toISOString(),
    });
  }

  const parsed = enquirySchema.safeParse(body.value);
  if (!parsed.success) {
    return respond(400, { error: 'validation_failed', fields: toFieldErrors(parsed.error) });
  }

  const verification = await verifyTurnstile(parsed.data.turnstileToken, {
    secret: env.TURNSTILE_SECRET_KEY,
    remoteIp: ip,
  });
  if (!verification.ok) {
    return verification.reason === 'rejected'
      ? respond(403, { error: 'verification_failed' })
      : respond(500, { error: 'server_error' });
  }

  if (parsed.data.consentVersion !== env.CONSENT_NOTICE_VERSION) {
    // Usually a cached public page after the notice changed. Keep the enquiry
    // and the version the visitor actually saw, and flag the mismatch.
    logger.warn('enquiry_consent_version_mismatch', {
      received: parsed.data.consentVersion,
      current: env.CONSENT_NOTICE_VERSION,
    });
  }

  try {
    const lead = await createLead(parsed.data);
    logger.info('enquiry_created', { leadId: lead.id, topic: parsed.data.topic });
    return respond(201, {
      id: lead.id,
      status: lead.status,
      replyDueAt: lead.replyDueAt.toISOString(),
    });
  } catch (error) {
    logger.error('enquiry_create_failed', {}, error);
    return respond(500, { error: 'server_error' });
  }
}

/** OPTIONS /api/leads: CORS preflight, answered only for allowed origins. */
export function enquiryPreflight(request: Request): Response {
  const origin = request.headers.get('origin');
  if (!isAllowedOrigin(origin, serverEnv().CORS_ALLOWED_ORIGINS)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}
