import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import type { FullConfig } from '@playwright/test';

import { PrismaClient } from '../../generated/prisma/client';
import { ADMIN_EMAIL, ADMIN_STATE, STAFF_EMAIL, STAFF_STATE } from './accounts';

/**
 * Empties the test database, adds a staff and an admin account, and signs
 * each in by creating a database session directly. Tests load the session
 * cookie from the saved storage state, so no email is ever sent.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url || !new URL(url).pathname.toLowerCase().includes('test')) {
    throw new Error(
      'E2E tests need DATABASE_URL pointing at a database whose name contains "test".',
    );
  }
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:3001';
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "LeadActivity", "LeadNote", "Lead", "Session", "Account", "VerificationToken", "PrivacyLog", "User" CASCADE',
    );
    mkdirSync('tests/e2e/.auth', { recursive: true });

    for (const [email, name, role, file] of [
      [STAFF_EMAIL, 'Erin Staff', 'STAFF', STAFF_STATE],
      [ADMIN_EMAIL, 'Alex Admin', 'ADMIN', ADMIN_STATE],
    ] as const) {
      const user = await prisma.user.create({ data: { email, name, role } });
      const sessionToken = randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
      await prisma.session.create({ data: { sessionToken, userId: user.id, expires } });

      const { hostname } = new URL(baseURL);
      writeFileSync(
        file,
        JSON.stringify({
          cookies: [
            {
              name: 'authjs.session-token',
              value: sessionToken,
              domain: hostname,
              path: '/',
              expires: Math.floor(expires.getTime() / 1000),
              httpOnly: true,
              secure: false,
              sameSite: 'Lax',
            },
          ],
          origins: [],
        }),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}
