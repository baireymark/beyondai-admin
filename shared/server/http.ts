import 'server-only';

import type { Failure } from '@/shared/lib/result';

/** Headers for responses that carry lead data: never cache them anywhere. */
export const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export type ErrorCode =
  | 'validation_failed'
  | 'verification_failed'
  | 'payload_too_large'
  | 'rate_limited'
  | 'server_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict';

/** The single error shape used by every endpoint (Planning/README.md section 10). */
export function jsonError(
  status: number,
  error: ErrorCode,
  options: { fields?: Record<string, string>; headers?: HeadersInit } = {},
): Response {
  const body = options.fields ? { error, fields: options.fields } : { error };
  return Response.json(body, { status, headers: { ...NO_STORE, ...options.headers } });
}

const CONFLICT_MESSAGES: Record<string, string> = {
  deleted: 'This enquiry is deleted. An admin must restore it first.',
  not_deleted: 'This enquiry is not deleted.',
};

/** Maps a domain failure (see shared/lib/result.ts) to an HTTP response. */
export function failureResponse(failure: Failure): Response {
  switch (failure.error) {
    case 'not_found':
      return jsonError(404, 'not_found');
    case 'validation_failed':
      return jsonError(400, 'validation_failed', { fields: failure.fields ?? {} });
    case 'forbidden':
      return jsonError(403, 'forbidden', failure.fields ? { fields: failure.fields } : {});
    default:
      return jsonError(409, 'conflict', {
        fields: failure.fields ?? { _form: CONFLICT_MESSAGES[failure.error] ?? failure.error },
      });
  }
}

export type JsonBodyResult =
  { ok: true; value: unknown } | { ok: false; reason: 'too_large' | 'invalid_json' };

/**
 * Reads a JSON body without buffering more than `limitBytes`. Checks the
 * declared Content-Length first, then counts bytes while streaming, because
 * chunked requests carry no length.
 */
export async function readJsonBody(request: Request, limitBytes: number): Promise<JsonBodyResult> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > limitBytes) return { ok: false, reason: 'too_large' };
  if (!request.body) return { ok: false, reason: 'invalid_json' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > limitBytes) {
      await reader.cancel();
      return { ok: false, reason: 'too_large' };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }
}
