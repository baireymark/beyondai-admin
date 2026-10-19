import { z } from 'zod';

import { authorizeApi } from '@/features/auth/server';
import { exportPersonData } from '@/features/privacy/server';
import { jsonError, NO_STORE } from '@/shared/server/http';
import { logger } from '@/shared/server/logger';

const emailSchema = z.string().trim().max(254).pipe(z.email());

/**
 * Data subject access request: every enquiry, note, and activity entry for
 * one email, as a JSON download. The email arrives in a POST form body, so it
 * never appears in a URL or in request logs. Admins only.
 */
export async function POST(request: Request): Promise<Response> {
  const access = await authorizeApi(request, { role: 'ADMIN' });
  if (!access.ok) return access.response;

  let email: unknown;
  try {
    email = (await request.formData()).get('email');
  } catch {
    email = undefined;
  }
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return jsonError(400, 'validation_failed', {
      fields: { email: 'Enter a valid email address' },
    });
  }

  const data = await exportPersonData(parsed.data, access.user);
  logger.info('privacy_export', { actorId: access.user.id, leadCount: data.leadCount });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...NO_STORE,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="data-export-${data.exportedAt.slice(0, 10)}.json"`,
    },
  });
}
