import { http, HttpResponse } from 'msw';

import type { HealthResponse } from '@/shared/api/schemas';

/** A Turnstile token the default handler rejects, for testing the bot path. */
export const REJECTED_TURNSTILE_TOKEN = 'rejected-token';

/** Default API mocks shared by unit and API tests. Override per test with server.use(). */
export const handlers = [
  http.get('*/api/health', () => HttpResponse.json<HealthResponse>({ ok: true })),
  http.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', async ({ request }) => {
    const token = new URLSearchParams(await request.text()).get('response');
    return token === REJECTED_TURNSTILE_TOKEN
      ? HttpResponse.json({ success: false, 'error-codes': ['invalid-input-response'] })
      : HttpResponse.json({ success: true, 'error-codes': [] });
  }),
];
