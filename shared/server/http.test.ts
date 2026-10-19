// @vitest-environment node
import { jsonError, readJsonBody } from './http';

function post(body: BodyInit, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/leads', { method: 'POST', body, headers });
}

describe('readJsonBody', () => {
  it('parses a small JSON body', async () => {
    await expect(readJsonBody(post('{"a":1}'), 100)).resolves.toEqual({
      ok: true,
      value: { a: 1 },
    });
  });

  it('rejects a body whose declared length is over the limit', async () => {
    await expect(readJsonBody(post('{}', { 'content-length': '20000' }), 16_384)).resolves.toEqual({
      ok: false,
      reason: 'too_large',
    });
  });

  it('rejects a streamed body that grows past the limit', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('x'.repeat(60)));
        controller.enqueue(new TextEncoder().encode('x'.repeat(60)));
        controller.close();
      },
    });
    const request = new Request('http://localhost/api/leads', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit);
    await expect(readJsonBody(request, 100)).resolves.toEqual({ ok: false, reason: 'too_large' });
  });

  it('reports malformed JSON', async () => {
    await expect(readJsonBody(post('{nope'), 100)).resolves.toEqual({
      ok: false,
      reason: 'invalid_json',
    });
  });
});

describe('jsonError', () => {
  it('uses the shared error shape and disables caching', async () => {
    const response = jsonError(400, 'validation_failed', { fields: { workEmail: 'Invalid' } });
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'validation_failed',
      fields: { workEmail: 'Invalid' },
    });
  });
});
