# 0004. Decisions for the admin application

- Status: accepted, pending review of the items marked "open in the plan"
- Date: 2026-10-19

## Context

[Planning/README.md](../../Planning/README.md) specifies the enquiry API and dashboard and lists several decisions as open (section 20). The app is built on the team's Next.js boilerplate, whose conventions sometimes differ from the plan's examples. This record lists what was chosen and why, so each choice can be reviewed or reversed.

## Decisions on items open in the plan

| Plan item               | Chosen                                                                                 | Why                                                                                                                                                                    | To reverse                                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Auth provider           | Auth.js v5 (`next-auth@5.0.0-beta.32`) with email sign-in links and database sessions  | Free, self-hosted, matches the plan's `AUTH_SECRET`/`AUTH_URL` and route layout. Database sessions make role changes and deactivation take effect on the next request. | Replace `features/auth/`; everything else calls `getCurrentUser()`, `requireUser()`, `requireAdmin()`, or `authorizeApi()`. |
| Email for sign-in links | Any SMTP server through `EMAIL_SERVER` (Google Workspace relay, Resend, SES, Postmark) | Provider-neutral. Links expire after 15 minutes.                                                                                                                       | Change `features/auth/email.ts`.                                                                                            |
| Database                | Postgres through Prisma 7 with the `pg` driver adapter                                 | Works with Supabase or Neon unchanged. Use the pooled URL for `DATABASE_URL` and the direct URL for `DIRECT_URL`.                                                      | None needed.                                                                                                                |
| Rate limiting           | Upstash when configured, in-memory otherwise                                           | Upstash shares limits across serverless instances. The in-memory fallback is per instance, and the app warns about it in production.                                   | Change `shared/server/rate-limit.ts`.                                                                                       |
| Staff export scope      | Staff export only enquiries assigned to them; admins export any filtered view          | The plan says staff export "their filtered list" but must not export all leads.                                                                                        | Change `exportLeadsCsv`.                                                                                                    |
| Preferred call time     | ISO 8601 with a time zone offset, for example `2026-10-22T14:00:00+08:00`              | Unambiguous. The public form should use a time picker in Manila time.                                                                                                  | Change `enquirySchema`.                                                                                                     |

Still open in the plan and not settled here: the admin domain, an access layer in front of the admin domain, consent wording, retention periods, the staff list and admin role holders, ownership of the 24-hour promise, and the hosting account.

## Departures from the plan

- **npm, not pnpm.** The boilerplate standardizes on npm 11 with exact pins (ADR 0003). The plan's `pnpm` commands map one to one to the `npm run` scripts in the README.
- **`features/` and `shared/` instead of `lib/`.** The plan's `lib/leads/*.ts` files live in `features/leads/server/`, `lib/validation/` in `features/leads/schema.ts` and `options.ts`, and `lib/security/*`, `lib/cors.ts`, `lib/db.ts`, and `lib/logging.ts` in `shared/server/`.
- **`proxy.ts`, not `middleware.ts`.** Next.js 16 renamed middleware to proxy.
- **The boilerplate's UI kit instead of shadcn/ui, and server-rendered tables instead of TanStack Table.** Filtering, sorting, and pagination happen in the database anyway, and a client table library would cost JavaScript for no added function. Dashboard pages stay under the 190 KB budget (about 178 KB measured).
- **The dashboard writes through Server Actions** (the boilerplate's convention). The Server Actions and the `/api/admin/*` route handlers call the same feature functions, so the rules are shared. The dashboard itself uses the admin API for the header counts and CSV export.
- **Additions:** `POST /api/admin/leads/[id]/restore` (the plan mentions restoring but lists no endpoint), `POST /api/admin/privacy/export` and the privacy page (section 13.4), `GET /api/cron/retention` (section 13.3), and `?scope=header` on the overview endpoint for the one-minute header refresh.
- **Zustand removed.** Nothing in this app needs shared client state.

## Not done in this pass

- **Sentry** (optional in the plan). It needs a DSN, CSP changes for its ingest host, and client JavaScript. The logger already redacts personal data, so add Sentry with `sendDefaultPii: false` and no request bodies.
- **MFA.** Auth.js has no built-in second factor. Sign-in links inherit the security of the staff email account, so require MFA on the email provider (for example Google Workspace 2-Step Verification), or add the optional access layer in front of the admin domain.
- **The public site changes** (plan section 11) belong to the beyondai.ph repository.

## Supply-chain notes

- Prisma is on 7.10.1, four days old at adoption. ADR 0003's 14-day minimum is waived for this patch release because 7.10.0 pulls in `deepmerge-ts` and `mysql2` versions with high-severity advisories that fail the CI audit. Renovate's vulnerability updates skip `minimumReleaseAge` for the same reason.
- `nodemailer` is on 10.0.15 through an npm override. Auth.js declares an optional peer range of `^7 || ^8`, and every 8.x release has high-severity advisories. The transport API Auth.js uses (`createTransport`, `sendMail`) is unchanged in 10.x.
