import { authorizeApi } from '@/features/auth/server';
import { exportLeadsCsv, leadListQuerySchema, toQueryRecord } from '@/features/leads/server';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { jsonError, NO_STORE } from '@/shared/server/http';
import { logger } from '@/shared/server/logger';

export async function GET(request: Request): Promise<Response> {
  const access = await authorizeApi(request);
  if (!access.ok) return access.response;

  const query = leadListQuerySchema.safeParse(toQueryRecord(new URL(request.url).searchParams));
  if (!query.success) {
    return jsonError(400, 'validation_failed', { fields: toFieldErrors(query.error) });
  }

  const now = new Date();
  const { csv, rowCount, truncated } = await exportLeadsCsv(query.data, access.user, now);
  logger.info('leads_exported', { actorId: access.user.id, role: access.user.role, rowCount });

  const date = now.toISOString().slice(0, 10);
  // The byte order mark makes Excel read the file as UTF-8 (names such as "Peña").
  return new Response(`﻿${csv}`, {
    headers: {
      ...NO_STORE,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="enquiries-${date}.csv"`,
      'X-Export-Row-Count': String(rowCount),
      'X-Export-Truncated': String(truncated),
    },
  });
}
