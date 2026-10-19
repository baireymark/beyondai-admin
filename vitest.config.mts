import { fileURLToPath } from 'node:url';

import nextEnv from '@next/env';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// API tests read DATABASE_URL from .env.test.local or the CI environment.
// Under NODE_ENV=test Next.js skips .env.local, so tests never touch the
// development database by accident.
process.env.NODE_ENV ??= 'test';
nextEnv.loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

// `server-only` throws outside a React Server Components bundle.
const serverOnlyStub = fileURLToPath(new URL('./tests/fixtures/server-only.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true, alias: { 'server-only': serverOnlyStub } },
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // next-auth imports "next/server" without an extension, which Node's ESM
    // resolver rejects; let Vite resolve it instead.
    server: { deps: { inline: ['next-auth'] } },
    env: {
      AUTH_SECRET: 'test-auth-secret-at-least-32-characters-long',
      AUTH_URL: 'http://localhost:3001',
      CORS_ALLOWED_ORIGINS: 'https://beyondai.ph,https://www.beyondai.ph',
      TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      CONSENT_NOTICE_VERSION: '2026-10',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          environmentOptions: { jsdom: { url: 'http://localhost:3001' } },
          include: ['**/*.test.{ts,tsx}'],
          exclude: ['node_modules', '.next', 'generated', 'tests/e2e/**', 'tests/api/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'api',
          environment: 'node',
          include: ['tests/api/**/*.test.ts'],
          setupFiles: ['./tests/api/setup.ts'],
          // The files share one database and truncate it between tests.
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['app/**', 'features/**', 'shared/**', 'config/**', 'proxy.ts'],
      exclude: ['**/*.stories.tsx', '**/*.test.{ts,tsx}', '**/index.ts'],
    },
  },
});
