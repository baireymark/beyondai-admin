import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { server } from '@/tests/fixtures/server';
import { fetchJson, HttpError } from './http';

const schema = z.object({ id: z.number() });

describe('fetchJson', () => {
  it('returns parsed data for a valid response', async () => {
    server.use(http.get('*/api/item', () => HttpResponse.json({ id: 1 })));
    await expect(fetchJson('/api/item', schema)).resolves.toEqual({ id: 1 });
  });

  it('throws HttpError with the status for a failed response', async () => {
    server.use(http.get('*/api/item', () => new HttpResponse(null, { status: 503 })));
    await expect(fetchJson('/api/item', schema)).rejects.toMatchObject({
      name: 'HttpError',
      status: 503,
    });
    await expect(fetchJson('/api/item', schema)).rejects.toBeInstanceOf(HttpError);
  });

  it('rejects a response that does not match the schema', async () => {
    server.use(http.get('*/api/item', () => HttpResponse.json({ id: 'one' })));
    await expect(fetchJson('/api/item', schema)).rejects.toThrow(/Unexpected response shape/);
  });
});
