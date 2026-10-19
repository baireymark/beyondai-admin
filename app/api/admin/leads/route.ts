import { authorizeApi } from '@/features/auth/server';
import { leadListQuerySchema, listLeads, toQueryRecord } from '@/features/leads/server';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { jsonError, NO_STORE } from '@/shared/server/http';

export async function GET(request: Request): Promise<Response> {
  const access = await authorizeApi(request);
  if (!access.ok) return access.response;

  const query = leadListQuerySchema.safeParse(toQueryRecord(new URL(request.url).searchParams));
  if (!query.success) {
    return jsonError(400, 'validation_failed', { fields: toFieldErrors(query.error) });
  }
  return Response.json(await listLeads(query.data, access.user), { headers: NO_STORE });
}
