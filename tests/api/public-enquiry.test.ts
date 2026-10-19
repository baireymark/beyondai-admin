import { http, HttpResponse } from 'msw';

import { OPTIONS, POST } from '@/app/api/leads/route';
import { validEnquiry } from '@/tests/fixtures/enquiry';
import { REJECTED_TURNSTILE_TOKEN } from '@/tests/fixtures/handlers';
import { server } from '@/tests/fixtures/server';
import { db, PUBLIC_ORIGIN } from './helpers';

let ipCounter = 0;

/** Each test posts from its own IP, so the in-memory rate limiter never interferes. */
function submit(
  body: unknown,
  options: { origin?: string | null; ip?: string; raw?: string } = {},
): Promise<Response> {
  ipCounter += 1;
  const headers = new Headers({
    'content-type': 'application/json',
    'x-forwarded-for': options.ip ?? `198.51.100.${ipCounter}`,
  });
  const origin = options.origin === undefined ? PUBLIC_ORIGIN : options.origin;
  if (origin) headers.set('origin', origin);
  return POST(
    new Request('http://localhost:3001/api/leads', {
      method: 'POST',
      headers,
      body: options.raw ?? JSON.stringify(body),
    }),
  );
}

describe('POST /api/leads', () => {
  it('saves a valid enquiry as New with a 24-hour reply deadline and logs its creation', async () => {
    const before = Date.now();
    const response = await submit(validEnquiry);

    expect(response.status).toBe(201);
    expect(response.headers.get('access-control-allow-origin')).toBe(PUBLIC_ORIGIN);
    const body = (await response.json()) as { id: string; status: string; replyDueAt: string };
    expect(body.status).toBe('NEW');

    const lead = await db.lead.findUniqueOrThrow({
      where: { id: body.id },
      include: { activity: true },
    });
    expect(lead).toMatchObject({
      fullName: 'Maria Santos',
      workEmail: 'maria@example.com',
      topic: 'PRODUCT_DEMO',
      interestAreas: ['ERP', 'HRM_SOFTWARE'],
      consentVersion: '2026-10',
      utmSource: 'linkedin',
      sourcePage: '/contact',
    });
    expect(lead.preferredCallTime?.toISOString()).toBe('2026-10-22T06:00:00.000Z');
    expect(lead.replyDueAt.getTime() - lead.createdAt.getTime()).toBe(24 * 3_600_000);
    expect(lead.consentAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(body.replyDueAt).getTime()).toBe(lead.replyDueAt.getTime());
    expect(lead.activity).toHaveLength(1);
    expect(lead.activity[0]).toMatchObject({ action: 'created', actorId: null });
  });

  it('returns field errors and saves nothing for invalid input', async () => {
    const response = await submit({ ...validEnquiry, workEmail: 'nope', message: 'short' });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'validation_failed',
      fields: {
        workEmail: 'Enter a valid email address',
        message: 'Write at least 10 characters',
      },
    });
    expect(await db.lead.count()).toBe(0);
  });

  it('rejects unknown fields', async () => {
    const response = await submit({ ...validEnquiry, status: 'WON' });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ fields: { status: 'Unknown field' } });
  });

  it('rejects a submission without consent', async () => {
    const response = await submit({ ...validEnquiry, consent: false });
    expect(response.status).toBe(400);
    expect(await db.lead.count()).toBe(0);
  });

  it('answers a filled honeypot with a fake success and saves nothing', async () => {
    const response = await submit({ ...validEnquiry, companyUrl: 'http://spam.example' });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; status: string };
    expect(body.id).toMatch(/^c[a-z0-9]{24}$/);
    expect(body.status).toBe('NEW');
    expect(await db.lead.count()).toBe(0);
  });

  it('refuses a token that Turnstile rejects', async () => {
    const response = await submit({ ...validEnquiry, turnstileToken: REJECTED_TURNSTILE_TOKEN });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'verification_failed' });
    expect(await db.lead.count()).toBe(0);
  });

  it('asks the visitor to retry when Turnstile is unreachable', async () => {
    server.use(
      http.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', () =>
        HttpResponse.error(),
      ),
    );
    const response = await submit(validEnquiry);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'server_error' });
  });

  it('refuses an origin that is not on the allowlist, without CORS headers', async () => {
    const response = await submit(validEnquiry, { origin: 'https://evil.example' });
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(await db.lead.count()).toBe(0);
  });

  it('refuses a request with no Origin header', async () => {
    expect((await submit(validEnquiry, { origin: null })).status).toBe(403);
  });

  it('rejects bodies over 16 KB', async () => {
    const response = await submit(null, {
      raw: JSON.stringify({ ...validEnquiry, message: 'x'.repeat(17_000) }),
    });
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: 'payload_too_large' });
  });

  it('rejects malformed JSON', async () => {
    expect((await submit(null, { raw: '{not json' })).status).toBe(400);
  });

  it('rate limits after 5 submissions from one IP and sends Retry-After', async () => {
    const ip = '203.0.113.99';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await submit(validEnquiry, { ip })).status).toBe(201);
    }
    const limited = await submit(validEnquiry, { ip });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    await expect(limited.json()).resolves.toEqual({ error: 'rate_limited' });
    expect(await db.lead.count()).toBe(5);
  });
});

describe('OPTIONS /api/leads', () => {
  function preflight(origin: string): Response {
    return OPTIONS(
      new Request('http://localhost:3001/api/leads', {
        method: 'OPTIONS',
        headers: { origin, 'access-control-request-method': 'POST' },
      }),
    );
  }

  it('allows the public site', () => {
    const response = preflight('https://www.beyondai.ph');
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('https://www.beyondai.ph');
    expect(response.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('vary')).toBe('Origin');
  });

  it('refuses other origins', () => {
    const response = preflight('https://evil.example');
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
