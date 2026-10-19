import 'server-only';

import { createHmac } from 'node:crypto';

/**
 * The visitor's IP as reported by the hosting proxy. Vercel overwrites
 * x-forwarded-for, so the first entry is trustworthy there. On other hosts,
 * make sure the proxy in front of the app does the same.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || null;
}

/**
 * Keyed hash of an identifier such as an IP address, so rate-limit keys
 * never hold the raw value (Planning/README.md section 13.2).
 */
export function hashIdentifier(value: string, secret: string, purpose: string): string {
  return createHmac('sha256', secret).update(`${purpose}:${value}`).digest('hex').slice(0, 32);
}
