import { authorizeApi } from '@/features/auth/server';
import { addUser, addUserSchema, listUsers } from '@/features/users/server';
import { toFieldErrors } from '@/shared/lib/zod-errors';
import { failureResponse, jsonError, NO_STORE, readJsonBody } from '@/shared/server/http';

export async function GET(request: Request): Promise<Response> {
  const access = await authorizeApi(request, { role: 'ADMIN' });
  if (!access.ok) return access.response;
  return Response.json(await listUsers(), { headers: NO_STORE });
}

/** Adds an email to the allowlist. */
export async function POST(request: Request): Promise<Response> {
  const access = await authorizeApi(request, { role: 'ADMIN' });
  if (!access.ok) return access.response;

  const body = await readJsonBody(request, 4 * 1024);
  if (!body.ok) {
    return body.reason === 'too_large'
      ? jsonError(413, 'payload_too_large')
      : jsonError(400, 'validation_failed', { fields: { _form: 'Send a JSON body' } });
  }
  const input = addUserSchema.safeParse(body.value);
  if (!input.success) {
    return jsonError(400, 'validation_failed', { fields: toFieldErrors(input.error) });
  }

  const result = await addUser(input.data);
  if (!result.ok) return failureResponse(result);
  return Response.json(result.value, { status: 201, headers: NO_STORE });
}
