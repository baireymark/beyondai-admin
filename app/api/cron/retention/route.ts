import { timingSafeEqual } from 'node:crypto';

import { serverEnv } from '@/config/env';
import { runRetention } from '@/features/privacy/server';
import { jsonError, NO_STORE } from '@/shared/server/http';
import { logger } from '@/shared/server/logger';

function bearerMatches(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? '');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * Daily retention job (vercel.json schedules it). Vercel Cron sends
 * "Authorization: Bearer $CRON_SECRET"; without CRON_SECRET the job is off.
 */
export async function GET(request: Request): Promise<Response> {
  const { CRON_SECRET } = serverEnv();
  if (!CRON_SECRET) return jsonError(404, 'not_found');
  if (!bearerMatches(request.headers.get('authorization'), CRON_SECRET)) {
    return jsonError(401, 'unauthorized');
  }

  const result = await runRetention();
  logger.info('retention_completed', result);
  return Response.json({ ok: true, ...result }, { headers: NO_STORE });
}
