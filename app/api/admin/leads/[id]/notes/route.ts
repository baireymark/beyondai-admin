import { authorizeApi } from '@/features/auth/server';
import { addNote, noteSchema } from '@/features/leads/server';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { failureResponse, jsonError, NO_STORE, readJsonBody } from '@/shared/server/http';

export async function POST(
  request: Request,
  { params }: RouteContext<'/api/admin/leads/[id]/notes'>,
): Promise<Response> {
  const access = await authorizeApi(request);
  if (!access.ok) return access.response;

  const body = await readJsonBody(request, 32 * 1024);
  if (!body.ok) {
    return body.reason === 'too_large'
      ? jsonError(413, 'payload_too_large')
      : jsonError(400, 'validation_failed', { fields: { _form: 'Send a JSON body' } });
  }
  const input = noteSchema.safeParse(body.value);
  if (!input.success) {
    return jsonError(400, 'validation_failed', { fields: toFieldErrors(input.error) });
  }

  const result = await addNote((await params).id, input.data.body, access.user);
  if (!result.ok) return failureResponse(result);
  return Response.json(result.value, { status: 201, headers: NO_STORE });
}
