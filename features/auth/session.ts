import 'server-only';

import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import type { Role } from '@/generated/prisma/enums';
import { jsonError } from '@/shared/server/http';
import { auth } from './auth';

export type CurrentUser = { id: string; email: string; name: string | null; role: Role };

/**
 * The signed-in, active staff member, or null. Reads the database session,
 * so a deactivated account loses access on its next request. Cached per
 * request, so layouts and pages can both call it.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email || !user.role || user.active !== true) return null;
  return { id: user.id, email: user.email, name: user.name ?? null, role: user.role };
});

/** For pages and Server Actions: sends signed-out visitors to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** For admin-only pages: staff get a 404, which does not reveal the page exists. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') notFound();
  return user;
}

/**
 * True when a state-changing request comes from this app's own pages.
 * Browsers always send Origin on POST, PATCH, and DELETE, so a missing or
 * foreign Origin means the request did not come from the dashboard.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  if (process.env.AUTH_URL) allowed.add(new URL(process.env.AUTH_URL).origin);
  return allowed.has(origin);
}

type ApiAuthResult = { ok: true; user: CurrentUser } | { ok: false; response: Response };

/**
 * Session and role check for every /api/admin route handler. The proxy only
 * checks that a session cookie exists; this is the real check.
 */
export async function authorizeApi(
  request: Request,
  options: { role?: Role } = {},
): Promise<ApiAuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: jsonError(401, 'unauthorized') };
  if (options.role === 'ADMIN' && user.role !== 'ADMIN') {
    return { ok: false, response: jsonError(403, 'forbidden') };
  }
  if (request.method !== 'GET' && request.method !== 'HEAD' && !isSameOrigin(request)) {
    return { ok: false, response: jsonError(403, 'forbidden') };
  }
  return { ok: true, user };
}
