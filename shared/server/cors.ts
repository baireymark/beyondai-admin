import 'server-only';

/**
 * CORS for the public enquiry endpoint only. Admin endpoints send no CORS
 * headers, so browsers refuse cross-origin calls to them.
 */
export function isAllowedOrigin(
  origin: string | null,
  allowed: readonly string[],
): origin is string {
  return origin !== null && allowed.includes(origin);
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}
