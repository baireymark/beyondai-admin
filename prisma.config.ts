import nextEnv from '@next/env';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env files. Load them the way Next.js does, so the
// CLI sees .env.local in development and .env.test.local under NODE_ENV=test.
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', {
  info: () => {},
  error: console.error,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations need a direct connection; the app uses the pooled DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
