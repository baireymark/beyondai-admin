// Runs before `npm run build` on Vercel (the `vercel-build` script).
//
// Production deployments, and any deployment with RUN_MIGRATIONS=true (set it
// on the staging branch), apply pending migrations before the new version
// receives traffic. Pull request previews share the staging database, so they
// never migrate it: a migration reaches staging only when it is merged there.
import { execSync } from 'node:child_process';

const shouldMigrate =
  process.env.VERCEL_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true';

if (!shouldMigrate) {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}).`);
  process.exit(0);
}

execSync('npx prisma migrate deploy', { stdio: 'inherit' });
