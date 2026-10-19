import { authorizeApi } from '@/features/auth/server';
import { updateUser, updateUserSchema } from '@/features/users/server';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { failureResponse, jsonError, NO_STORE, readJsonBody } from '@/shared/server/http';

/** Changes a staff member's name or role, or activates or deactivates the account. */
export async function PATCH(
  request: Request,
  { params }: RouteContext<'/api/admin/users/[id]'>,
): Promise<Response> {
  const access = await authorizeApi(request, { role: 'ADMIN' });
  if (!access.ok) return access.response;

  const body = await readJsonBody(request, 4 * 1024);
  if (!body.ok) {
    return body.reason === 'too_large'
      ? jsonError(413, 'payload_too_large')
      : jsonError(400, 'validation_failed', { fields: { _form: 'Send a JSON body' } });
  }
  const input = updateUserSchema.safeParse(body.value);
  if (!input.success) {
    return jsonError(400, 'validation_failed', { fields: toFieldErrors(input.error) });
  }

  const result = await updateUser((await params).id, input.data, access.user);
  if (!result.ok) return failureResponse(result);
  return Response.json(result.value, { headers: NO_STORE });
}
