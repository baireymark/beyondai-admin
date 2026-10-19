// Setup for the API test project (vitest.config.mts). These tests run route
// handlers against a real Postgres database and empty it before each test.

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'API tests need a test database. Set DATABASE_URL in .env.test.local (see README, "Running tests").',
  );
}
if (!new URL(url).pathname.toLowerCase().includes('test')) {
  throw new Error(
    'Refusing to run API tests: they delete all data, so the database name must contain "test".',
  );
}

// Replace Auth.js with a controllable session. Everything after auth() runs
// for real: the active-user check, role checks, and the same-origin check.
vi.mock('@/features/auth/auth', () => ({
  auth: vi.fn(() => Promise.resolve(null)),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
  SESSION_MAX_AGE_SECONDS: 43_200,
}));

beforeEach(async () => {
  const { resetDatabase } = await import('./helpers');
  await resetDatabase();
});

afterAll(async () => {
  const { db } = await import('@/shared/server/db');
  await db.$disconnect();
});
