import { auth } from '@/features/auth/auth';
import type { Prisma } from '@/generated/prisma/client';
import type { Role } from '@/generated/prisma/enums';
import { db } from '@/shared/server/db';

export { db };

export const APP_ORIGIN = 'http://localhost:3001';
export const PUBLIC_ORIGIN = 'https://beyondai.ph';

export async function resetDatabase(): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE "LeadActivity", "LeadNote", "Lead", "Session", "Account", "VerificationToken", "PrivacyLog", "User" CASCADE',
  );
}

type TestUser = { id: string; email: string; name: string | null; role: Role; active: boolean };

let userCount = 0;
export async function createUser(
  overrides: Partial<Pick<TestUser, 'email' | 'name' | 'role' | 'active'>> = {},
): Promise<TestUser> {
  userCount += 1;
  return db.user.create({
    data: {
      email: overrides.email ?? `user${userCount}@beyondai.test`,
      name: overrides.name ?? `User ${userCount}`,
      role: overrides.role ?? 'STAFF',
      active: overrides.active ?? true,
    },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
}

/** Makes auth() return a database session for this user, or none. */
export function signInAs(user: TestUser | null): void {
  vi.mocked(auth).mockResolvedValue(
    // The mock replaces the overloaded NextAuth auth(); only the session shape matters here.
    (user
      ? { user: { ...user }, expires: new Date(Date.now() + 3_600_000).toISOString() }
      : null) as never,
  );
}

const HOUR = 3_600_000;

export async function createLead(
  overrides: Partial<Prisma.LeadUncheckedCreateInput> = {},
): Promise<{ id: string }> {
  const createdAt = (overrides.createdAt as Date | undefined) ?? new Date();
  return db.lead.create({
    data: {
      fullName: 'Maria Santos',
      workEmail: 'maria@example.com',
      organization: 'Example Corp',
      topic: 'PRODUCT_DEMO',
      interestAreas: ['ERP'],
      message: 'We are looking at replacing our HR system.',
      consentAt: createdAt,
      consentVersion: '2026-10',
      replyDueAt: new Date(createdAt.getTime() + 24 * HOUR),
      ...overrides,
      createdAt,
    },
    select: { id: true },
  });
}

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * HOUR);
}

/** A request to this app. Mutations carry the app's own Origin, as a browser would send. */
export function appRequest(
  path: string,
  init: { method?: string; body?: unknown; origin?: string | null } = {},
): Request {
  const method = init.method ?? 'GET';
  const headers = new Headers();
  const origin = init.origin === undefined ? (method === 'GET' ? null : APP_ORIGIN) : init.origin;
  if (origin) headers.set('origin', origin);
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  return new Request(`${APP_ORIGIN}${path}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export function params<T extends Record<string, string>>(value: T): { params: Promise<T> } {
  return { params: Promise.resolve(value) };
}
