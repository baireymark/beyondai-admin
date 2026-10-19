# BeyondAi Admin

The enquiry API and staff dashboard for beyondai.ph. The public contact form posts each enquiry to this app, which saves it in Postgres with a 24-hour reply deadline. Invited staff sign in at `admin.beyondai.ph` to filter enquiries, assign owners, add notes, and move them through New → Contacted → Qualified → Won or Lost. Every change is recorded in an append-only activity log.

The full specification is in [Planning/README.md](Planning/README.md). This app is built on the team's Next.js boilerplate, and [docs/adr/0004-admin-app-decisions.md](docs/adr/0004-admin-app-decisions.md) records where it settles the plan's open decisions or departs from it.

## Requirements

- Node.js 24 (see `.nvmrc`; run `nvm use`)
- npm 11 or newer (`.npmrc` sets `engine-strict`, so older versions fail with a clear message)
- Postgres 15 or newer: a local install, Docker, or a Supabase or Neon development database

## Getting started

```bash
nvm use
npm install                    # also generates the Prisma client
cp .env.example .env.local     # then fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
npx auth secret                # prints a value for AUTH_SECRET
npm run db:migrate             # creates the schema
npm run db:seed                # admins from ADMIN_SEED_EMAILS, plus sample data
npm run dev                    # http://localhost:3001
```

To sign in locally, enter an email from `ADMIN_SEED_EMAILS`, or `staff@example.com` for the seeded staff account. Without `EMAIL_SERVER`, the sign-in link is printed in the terminal running `npm run dev`. Open it in the same browser.

Run the public website separately on port 3000 with `NEXT_PUBLIC_ENQUIRY_API_URL=http://localhost:3001`. `CORS_ALLOWED_ORIGINS=http://localhost:3000` lets it post enquiries.

## Running tests

| Command             | What runs                                                                | Needs                                          |
| ------------------- | ------------------------------------------------------------------------ | ---------------------------------------------- |
| `npm run test:unit` | Unit and component tests (Vitest, jsdom)                                 | Nothing                                        |
| `npm run test:api`  | Route handlers against a real database: every status code and role check | A test database                                |
| `npm test`          | Both of the above                                                        | A test database                                |
| `npm run test:e2e`  | Playwright in Chromium, Firefox, and WebKit, with axe and CSP checks     | A test database; `npx playwright install` once |

API and E2E tests delete all data between runs, so they refuse to start unless the database name contains `test`. Create one and point `.env.test.local` at it:

```bash
createdb beyondai_admin_test
echo 'DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/beyondai_admin_test' > .env.test.local
echo 'DIRECT_URL=postgresql://USER:PASSWORD@localhost:5432/beyondai_admin_test' >> .env.test.local
NODE_ENV=test npx prisma migrate deploy
```

Under `NODE_ENV=test`, Next.js and these tools ignore `.env.local`, so tests never touch your development database. E2E tests sign in by creating sessions directly in the test database (see `tests/e2e/global-setup.ts`), so they never send email.

## Scripts

| Script               | What it does                                                                 |
| -------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`        | Development server on port 3001                                              |
| `npm run build`      | Generate the Prisma client, then build for production                        |
| `npm start`          | Serve the production build on port 3001                                      |
| `npm run lint`       | ESLint, including module-boundary rules; fails on any warning                |
| `npm run typecheck`  | Generate the Prisma client and route types, then run the TypeScript compiler |
| `npm run format`     | Format every file with Prettier                                              |
| `npm run db:migrate` | Create and apply a migration locally (`prisma migrate dev`)                  |
| `npm run db:deploy`  | Apply pending migrations (CI, staging, production)                           |
| `npm run db:seed`    | Seed admins and, outside production, sample data                             |
| `npm run db:studio`  | Browse the database in Prisma Studio                                         |
| `npm run storybook`  | Component workshop at http://localhost:6006                                  |
| `npm run lhci`       | Lighthouse CI against a production build                                     |

## Project structure

```text
app/
  login/                    sign-in page
  (dashboard)/              signed-in pages: overview, leads, leads/[id], settings/users, settings/privacy
  api/leads/                POST (public enquiry), OPTIONS (CORS preflight)
  api/admin/                session-protected JSON API used by the dashboard
  api/auth/[...nextauth]/   Auth.js endpoints
  api/cron/retention/       daily retention job
  api/health/               uptime check
features/                   one folder per feature
  auth/                     Auth.js setup, session and role checks, login form
  leads/                    enquiry intake, list, detail, status rules, CSV export, overview
  users/                    staff allowlist management
  privacy/                  data subject export and erasure, retention
shared/
  ui/                       design-system components
  lib/                      pure helpers (Manila time, CSV, form state)
  server/                   server-only infrastructure: Prisma client, logger, CORS, Turnstile, rate limits
  api/                      fetch client and browser-side response schemas
config/env.ts               environment validation
prisma/                     schema, migrations, seed
proxy.ts                    per-request CSP nonce and the signed-out gate (Next.js 16's middleware)
tests/api/                  route handler tests against a real database
tests/e2e/                  Playwright specs
```

Each feature exposes two entry points: `index.ts` for client-safe exports and `server.ts` for server-only ones. Imports flow `app` → `features` → `shared`, and ESLint fails the build on any other direction. See [docs/architecture.md](docs/architecture.md).

## Environment variables

Every variable is listed in [.env.example](.env.example) and validated at startup by `config/env.ts`. The server exits with a clear message if a value is missing or malformed. Production also requires `AUTH_URL` and `EMAIL_SERVER`.

| Variable                                             | Required       | Purpose                                                           |
| ---------------------------------------------------- | -------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                                       | Yes            | Pooled Postgres connection used by the app                        |
| `DIRECT_URL`                                         | For migrations | Direct connection used by `prisma migrate`                        |
| `AUTH_SECRET`                                        | Yes            | Session and token signing secret, 32+ characters, per environment |
| `AUTH_URL`                                           | Production     | Public base URL, for example `https://admin.beyondai.ph`          |
| `EMAIL_SERVER`, `EMAIL_FROM`                         | Production     | SMTP server and sender for sign-in links                          |
| `CORS_ALLOWED_ORIGINS`                               | Yes            | Origins allowed to post enquiries                                 |
| `TURNSTILE_SECRET_KEY`                               | Yes            | Cloudflare Turnstile secret                                       |
| `CONSENT_NOTICE_VERSION`                             | Yes            | Current privacy notice version; must match the public site        |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Recommended    | Rate limits shared across instances                               |
| `CRON_SECRET`                                        | Recommended    | Turns on the daily retention job                                  |
| `ADMIN_SEED_EMAILS`                                  | First setup    | Emails the seed script adds as admins                             |

## Deployment

The app deploys to Vercel as its own project, separate from the public site.

1. Create the Vercel project from this repository and set the variables above for each environment. Each environment has its own database, secrets, and Turnstile keys.
2. Vercel runs `npm run vercel-build`. On production deployments, and wherever `RUN_MIGRATIONS=true` is set (the staging branch), it applies migrations with `prisma migrate deploy` before building. Pull request previews share the staging database and never migrate it.
3. For a new environment, run `npm run db:seed` once with `ADMIN_SEED_EMAILS` set, so the first admin can sign in and invite everyone else. In production the seed adds no sample data.
4. `vercel.json` schedules the retention job daily at 03:00 Manila time. Set `CRON_SECRET` to turn it on.

Deploy this app first and confirm `GET /api/health`, then ship the public site change that posts to it. [docs/release-checklist.md](docs/release-checklist.md) has the smoke test.

For self-hosting, `docker build -t beyondai-admin .` builds a standalone image with a health check on `/api/health`. The image does not run migrations; run `npm run db:deploy` against the database as a release step first.

## Documentation

- [Planning document](Planning/README.md): requirements, data model, API reference, security, privacy
- [Architecture](docs/architecture.md)
- [Adding a feature](docs/adding-a-feature.md)
- [Release checklist](docs/release-checklist.md)
- [Decision records](docs/adr/)
- [Contributing](CONTRIBUTING.md)
