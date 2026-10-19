import { authorizeApi } from '@/features/auth/server';
import { getHeaderCounts, getOverview } from '@/features/leads/server';
import { NO_STORE } from '@/shared/server/http';

/**
 * Counts for the overview page and the header. `?scope=header` returns only
 * the header counts, which the dashboard polls every minute.
 */
export async function GET(request: Request): Promise<Response> {
  const access = await authorizeApi(request);
  if (!access.ok) return access.response;

  const now = new Date();
  if (new URL(request.url).searchParams.get('scope') === 'header') {
    return Response.json(await getHeaderCounts(now), { headers: NO_STORE });
  }
  const [overview, header] = await Promise.all([getOverview(now), getHeaderCounts(now)]);
  return Response.json({ ...overview, header }, { headers: NO_STORE });
}
