import { safeParse, type $ZodType } from 'zod/v4/core';

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function resolveUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  // Relative paths resolve against the current origin in the browser.
  if (typeof window !== 'undefined') return new URL(path, window.location.origin).toString();
  throw new Error(`fetchJson needs an absolute URL on the server, got "${path}"`);
}

/**
 * Fetches JSON and validates it against a Zod schema, so a changed API shape
 * fails loudly at the boundary instead of deep inside a component. Accepts
 * both zod and zod/mini schemas; browser code should pass zod/mini ones.
 */
export async function fetchJson<T>(
  path: string,
  schema: $ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(resolveUrl(path), {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    throw new HttpError(
      `Request to ${path} failed with status ${response.status}`,
      response.status,
    );
  }

  const result = safeParse(schema, await response.json());
  if (!result.success) {
    throw new Error(`Unexpected response shape from ${path}`, { cause: result.error });
  }
  return result.data;
}
