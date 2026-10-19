// @vitest-environment node
import { http, HttpResponse } from 'msw';

import { server } from '@/tests/fixtures/server';
import { TURNSTILE_VERIFY_URL, verifyTurnstile } from './turnstile';

const options = { secret: 'test-secret', remoteIp: '203.0.113.7' };

describe('verifyTurnstile', () => {
  it('accepts a token Cloudflare marks as valid and sends the secret and IP', async () => {
    let sent: URLSearchParams | undefined;
    server.use(
      http.post(TURNSTILE_VERIFY_URL, async ({ request }) => {
        sent = new URLSearchParams(await request.text());
        return HttpResponse.json({ success: true, 'error-codes': [] });
      }),
    );
    await expect(verifyTurnstile('token-1', options)).resolves.toEqual({ ok: true });
    expect(sent?.get('secret')).toBe('test-secret');
    expect(sent?.get('response')).toBe('token-1');
    expect(sent?.get('remoteip')).toBe('203.0.113.7');
  });

  it('rejects a token Cloudflare refuses, such as a replay', async () => {
    server.use(
      http.post(TURNSTILE_VERIFY_URL, () =>
        HttpResponse.json({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
      ),
    );
    await expect(verifyTurnstile('used', options)).resolves.toEqual({
      ok: false,
      reason: 'rejected',
    });
  });

  it('reports Cloudflare being unreachable separately from a rejection', async () => {
    server.use(http.post(TURNSTILE_VERIFY_URL, () => HttpResponse.error()));
    await expect(verifyTurnstile('token', options)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('treats an unexpected response shape as unavailable', async () => {
    server.use(http.post(TURNSTILE_VERIFY_URL, () => HttpResponse.json({ nope: true })));
    await expect(verifyTurnstile('token', options)).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });
});
