import nextEnv from '@next/env';
import { defineConfig, devices } from '@playwright/test';

// E2E tests use the test database from .env.test.local (or CI env), never the
// development database. The server they start gets the same DATABASE_URL,
// which takes precedence over .env.local. Test mode is set only while the
// files load, so the server itself still builds and runs as production.
const env = process.env as Record<string, string | undefined>;
const nodeEnv = env.NODE_ENV;
env.NODE_ENV = 'test';
nextEnv.loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
// process.env stores strings, so assigning undefined would set "undefined".
if (nodeEnv === undefined) delete env.NODE_ENV;
else env.NODE_ENV = nodeEnv;
// @next/env marks the environment as loaded; without this the server it
// spawns would skip loading .env.local.
delete env.__NEXT_PROCESSED_ENV;

const PORT = Number(process.env.PORT ?? 3001);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  // The tests share one database.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  // Tests run against a production build. Set PLAYWRIGHT_BASE_URL to test a
  // preview deployment instead of starting a local server.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? 'npm run start' : 'npm run build && npm run start',
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          DATABASE_URL: process.env.DATABASE_URL ?? '',
          // Production requires an SMTP server; the E2E tests never send email.
          EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST ?? 'localhost',
          EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT ?? '2525',
          CORS_ALLOWED_ORIGINS: process.env.E2E_PUBLIC_ORIGIN ?? 'http://localhost:3000',
        },
      },
});
