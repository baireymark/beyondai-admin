import { authorizeApi } from '@/features/auth/server';
import { getLead, leadUpdateSchema, softDeleteLead, updateLead } from '@/features/leads/server';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { failureResponse, jsonError, NO_STORE, readJsonBody } from '@/shared/server/http';

type Context = RouteContext<'/api/admin/leads/[id]'>;

export async function GET(request: Request, { params }: Context): Promise<Response> {
  const access = await authorizeApi(request);
  if (!access.ok) return access.response;

  const lead = await getLead((await params).id, access.user);
  if (!lead) return jsonError(404, 'not_found');
  return Response.json(lead, { headers: NO_STORE });
}

/** Changes status or owner. Each change writes one activity row in the same transaction. */
export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const access = await authorizeApi(request);
  if (!access.ok) return access.response;

  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) {
    return body.reason === 'too_large'
      ? jsonError(413, 'payload_too_large')
      : jsonError(400, 'validation_failed', { fields: { _form: 'Send a JSON body' } });
  }
  const input = leadUpdateSchema.safeParse(body.value);
  if (!input.success) {
    return jsonError(400, 'validation_failed', { fields: toFieldErrors(input.error) });
  }

  const result = await updateLead((await params).id, input.data, access.user);
  if (!result.ok) return failureResponse(result);
  return Response.json(result.value, { headers: NO_STORE });
}

/** Soft delete. Admins only. */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const access = await authorizeApi(request, { role: 'ADMIN' });
  if (!access.ok) return access.response;

  const result = await softDeleteLead((await params).id, access.user);
  if (!result.ok) return failureResponse(result);
  return Response.json(result.value, { headers: NO_STORE });
}
