import { authorizeApi } from '@/features/auth/server';
import { restoreLead } from '@/features/leads/server';
import { failureResponse, NO_STORE } from '@/shared/server/http';

/** Undoes a soft delete. Admins only. */
export async function POST(
  request: Request,
  { params }: RouteContext<'/api/admin/leads/[id]/restore'>,
): Promise<Response> {
  const access = await authorizeApi(request, { role: 'ADMIN' });
  if (!access.ok) return access.response;

  const result = await restoreLead((await params).id, access.user);
  if (!result.ok) return failureResponse(result);
  return Response.json(result.value, { headers: NO_STORE });
}
