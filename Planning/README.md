# BeyondAi Admin: Enquiry API and Dashboard

> **Status:** Planning (v0.2)
> **Owner:** [Name / team]
> **Last updated:** October 2026

A separate application that receives enquiries from the BeyondAi website and gives the team a dashboard to manage them. It contains two parts:

1. **Enquiry API:** receives the contact form submissions from beyondai.ph and stores them in Postgres.
2. **Admin dashboard:** a web app where staff view every enquiry, filter them, assign owners, add notes, and update status.

The public website (beyondai.ph) stays a marketing site. It has no admin pages. The only change to it is that the contact form posts to this application's API.

---

## Table of contents

1. [Overview](#1-overview)
2. [Goals and non-goals](#2-goals-and-non-goals)
3. [Users and roles](#3-users-and-roles)
4. [Functional requirements](#4-functional-requirements)
5. [Lead lifecycle](#5-lead-lifecycle)
6. [Tech stack](#6-tech-stack)
7. [Architecture](#7-architecture)
8. [Project structure](#8-project-structure)
9. [Data model](#9-data-model)
10. [API reference](#10-api-reference)
11. [Changes to the public website](#11-changes-to-the-public-website)
12. [Security](#12-security)
13. [Privacy and compliance](#13-privacy-and-compliance)
14. [Configuration](#14-configuration)
15. [Local development](#15-local-development)
16. [Testing strategy](#16-testing-strategy)
17. [Deployment](#17-deployment)
18. [Operations and runbooks](#18-operations-and-runbooks)
19. [Roadmap](#19-roadmap)
20. [Open decisions](#20-open-decisions)
21. [Glossary](#21-glossary)

---

## 1. Overview

The contact page at beyondai.ph/contact collects enquiries about consultations, product demos, AI Education, corporate training, partnerships, technical support, and other topics. Today those enquiries are sent by email.

This project replaces that flow:

- The contact form on beyondai.ph sends each enquiry to this application's **API** (`POST /api/leads`).
- The API validates the enquiry and **stores it in Postgres** with status `New` and a reply deadline 24 hours out.
- Staff sign in to the **admin dashboard** at `admin.beyondai.ph` to see every enquiry, filter them, assign owners, add notes, and update status.
- Every change is recorded in an **activity log**.

The database and dashboard replace the inbox. Email notifications are not part of version 1.

**Deployment model:** one separate application (this repo) hosts both the API and the dashboard, on its own domain. The public website is a different application in its own repo. They communicate only through the public enquiry endpoint.

---

## 2. Goals and non-goals

### Goals

- **No enquiry is lost.** A visitor sees a success message only after the enquiry is saved.
- **One place to work.** All enquiries, with their status and history, are visible in one dashboard.
- **Visible accountability.** The public promise of a reply within 24 hours is tracked and shown to staff.
- **Clear audit trail.** Who changed what, and when.
- **Separation.** The marketing site and the internal tools are separate applications, so a problem in one does not take down the other, and admin code is never served from the public site.
- **Privacy by design.** Consent is recorded, personal data is limited, and access is restricted.

### Non-goals (version 1)

- Email or Slack notifications (may be added later)
- A full CRM: deal values, invoices, quotes, or sales forecasting
- Public sign-up or self-service accounts for staff
- Marketing automation or email campaigns
- A mobile app
- Content management for blog posts or landing pages
- Importing leads from other systems (may be added later)

---

## 3. Users and roles

| Role | Who | Can do |
|---|---|---|
| **Visitor** | Anyone on beyondai.ph | Submit an enquiry through the contact form |
| **Staff** | Sales, account, and training team members | View enquiries, change status and owner, add notes, export their filtered list |
| **Admin** | Operations or management lead | Everything staff can do, plus manage staff access, export all data, and delete data on request |

Access to the dashboard is by invitation only. Staff accounts come from an allowlist of email addresses managed by an admin. There is no public sign-up.

---

## 4. Functional requirements

### 4.1 Public enquiry form (on beyondai.ph/contact)

The form keeps the fields from the current page. Required fields are marked.

| Field | Required | Validation | Stored as |
|---|---|---|---|
| Full name | Yes | 2 to 120 characters | `fullName` |
| Work email | Yes | Valid email, max 254 characters | `workEmail` |
| Organization | No | Max 160 characters | `organization` |
| Topic | Yes | One of the topic values in section 9 | `topic` |
| Area of interest | No | Up to 5 values from the interest list | `interestAreas` |
| Preferred call time | No | Date and time, entered in Asia/Manila time (UTC+8) | `preferredCallTime` |
| Message | Yes | 10 to 2000 characters | `message` |
| Consent checkbox | Yes | Must be checked | `consentAt`, `consentVersion` |
| Honeypot (hidden field) | No | Must be empty | Not stored; a filled value causes a silent reject |
| Turnstile token | Yes | Verified on the server | Not stored |

**Topic values:** Book a consultation, Product demo, AI Education course enquiry, Corporate or team AI training, Partnership, Technical support, Something else.

**Area of interest values:** Not sure yet; Cloud Modernization; AI & Analytics; Cybersecurity & Compliance; Software Development; Managed Services; Resource Augmentation; HRM Software; ERP; Count Trust; Talkora AI; Agentic AI; AI Education.

Behavior:

- The form shows field-level errors from the API without clearing the visitor's input.
- On success, the form shows a confirmation that includes the reply window (within 24 hours).
- On a server or network error, the form shows a retry message and keeps the input.
- The form is accessible: labels, keyboard navigation, and error announcements for screen readers.

### 4.2 Admin dashboard (admin.beyondai.ph)

**Sign-in (`/login`)**

- Email sign-in for allowlisted staff only
- Inactive or unlisted emails see the same generic message, so the page does not reveal who has access

**Overview (`/`)**

- Count of new enquiries today and this week
- Count of overdue enquiries
- Breakdown by topic for the last 30 days
- Conversion from New to Won over the last 30 days

**Enquiry list (`/leads`)**

- Table with name, organization, topic, status, owner, created date, and reply deadline
- Overdue enquiries (past `replyDueAt`, still `New` or `Contacted` with no first reply) appear first and show an "Overdue" badge
- Filters: status, topic, owner, overdue only, created date range, interest area
- Search across name, email, and organization
- Sorting by created date, reply deadline, and status
- Pagination (default 25 per page)
- "My enquiries" saved view (assigned to the signed-in user)
- CSV export of the current filtered view

**Enquiry detail (`/leads/[id]`)**

- Contact details and organization
- Topic, interest areas, and preferred call time (shown in Manila time, with the viewer's local time as a secondary label)
- The full message
- Consent record: when it was given and which notice version applied
- Status dropdown and owner selector
- Notes timeline with an add-note form
- Activity history: every status, owner, and note change, with actor and timestamp
- Soft delete action, restricted to admins

**Users (`/settings/users`, admin only)**

- List staff accounts
- Add an email to the allowlist, change a role, deactivate an account

**Header:** a count of New enquiries, visible on every page, so staff notice new arrivals.

### 4.3 Notifications

Version 1 has no outbound notifications. Staff check the dashboard, where the header count shows new arrivals.

---

## 5. Lead lifecycle

### 5.1 Statuses

| Status | Meaning |
|---|---|
| **New** | Saved, not yet reviewed by anyone |
| **Contacted** | A staff member has replied or made contact |
| **Qualified** | The enquiry is a real opportunity with a clear need |
| **Won** | The engagement or sale is agreed |
| **Lost** | Not pursued, no fit, or no response |

### 5.2 Transitions

Any status can move to any other status, and every change is logged in the activity table. Simple rules keep the data clean:

- Setting `Contacted` sets `firstContactedAt` if it is empty.
- Moving to `Won` or `Lost` requires a short reason in the note.
- Deleted enquiries cannot be edited until an admin restores them.

### 5.3 Reply deadline

- When an enquiry is created, `replyDueAt` is set to `createdAt + 24 hours`.
- An enquiry is **overdue** when the current time is past `replyDueAt` and `firstContactedAt` is empty.
- Overdue enquiries are highlighted in the list, the overview, and the header count.

---

## 6. Tech stack

| Area | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router), TypeScript | One app serves the API route handlers and the dashboard |
| Styling | Tailwind CSS, shadcn/ui | Matches the public site's look |
| Validation | Zod | Shared schemas for API input and dashboard forms |
| Database | Postgres (Supabase or Neon) | Managed, with backups and point-in-time restore |
| ORM | Prisma | Migrations and typed queries |
| Auth | Auth.js (or Clerk) | Invite-only staff login, see section 20 |
| Table UI | TanStack Table | Sorting, filtering, pagination |
| Spam protection | Cloudflare Turnstile + honeypot | Verified on the server before saving |
| Rate limiting | Upstash Ratelimit or Cloudflare rules | Per-IP limits on the public endpoint |
| Error monitoring | Sentry | With PII scrubbing enabled |
| Hosting | Vercel | Preview deployments per pull request |
| Testing | Vitest, Playwright | Unit, API, and end-to-end |

---

## 7. Architecture

```
  Visitor                                  Staff
    │                                        │
    ▼                                        ▼
┌──────────────────────────┐        ┌──────────────────────────────┐
│ beyondai.ph (public)     │        │ admin.beyondai.ph            │
│ Next.js, existing site   │        │ Next.js: dashboard + API     │
│ /contact form            │        │                              │
│ + Turnstile widget       │        │ UI:  /, /leads, /login, ...  │
└────────────┬─────────────┘        │ API: /api/leads (public)     │
             │ POST /api/leads      │      /api/admin/* (session)  │
             │ (CORS allowlist)     └───────────────┬──────────────┘
             └────────────────────────────────────▶ │ Prisma
                                                    ▼
                                    ┌──────────────────────────────┐
                                    │ Postgres                     │
                                    │ leads, notes, activity,      │
                                    │ users                        │
                                    └──────────────────────────────┘
```

Key decisions:

- **Two applications, two repos.** The public website and the admin application deploy independently. A bad admin release does not affect the marketing site, and the admin code, its dependencies, and its secrets never ship to the public site.
- **One API home.** All enquiry data flows through `admin.beyondai.ph`. The public site never talks to the database.
- **Thin route handlers.** Route handlers parse input, check auth, and call functions in `lib/leads/`. Business rules live in `lib/leads/`, where they can be unit tested.
- **Database is the source of truth.** There is no second copy of enquiries in email or spreadsheets.
- **Cross-origin access is limited.** Only the public endpoint accepts requests from beyondai.ph. Admin endpoints accept only requests from the admin domain, with session cookies.

---

## 8. Project structure

Repository: `beyondai-admin`

```
beyondai-admin/
├── app/
│   ├── login/page.tsx                  # sign-in
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # sidebar, header count, session check
│   │   ├── page.tsx                    # overview
│   │   ├── leads/
│   │   │   ├── page.tsx                # enquiry list
│   │   │   └── [id]/page.tsx           # enquiry detail
│   │   └── settings/users/page.tsx     # admin only
│   ├── api/
│   │   ├── leads/route.ts              # POST (public), OPTIONS (CORS preflight)
│   │   ├── health/route.ts             # GET, uptime check
│   │   ├── auth/[...nextauth]/route.ts # auth provider endpoints
│   │   └── admin/
│   │       ├── leads/route.ts          # GET list
│   │       ├── leads/export/route.ts   # GET CSV
│   │       ├── leads/[id]/route.ts     # GET, PATCH, DELETE
│   │       ├── leads/[id]/notes/route.ts
│   │       ├── overview/route.ts       # GET counts
│   │       └── users/route.ts          # GET, POST, PATCH (admin only)
├── components/
│   ├── admin/                          # tables, filters, status select, notes
│   └── ui/                             # shadcn/ui components
├── lib/
│   ├── db.ts                           # Prisma client singleton
│   ├── auth.ts                         # auth config, role helpers
│   ├── cors.ts                         # origin allowlist for the public endpoint
│   ├── leads/
│   │   ├── create-lead.ts
│   │   ├── update-lead.ts              # status and owner changes, logs activity
│   │   ├── list-leads.ts               # filters, search, pagination
│   │   ├── export-leads.ts
│   │   └── deadlines.ts                # replyDueAt and overdue logic
│   ├── validation/
│   │   ├── lead.ts                     # Zod schemas
│   │   └── options.ts                  # topic and interest lists
│   ├── security/
│   │   ├── turnstile.ts
│   │   └── rate-limit.ts
│   └── logging.ts                      # logger with PII redaction
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                         # sample enquiries and a dev staff account
├── middleware.ts                       # protects dashboard pages and /api/admin/*
├── tests/
│   ├── unit/
│   ├── api/
│   └── e2e/
├── .env.example
├── next.config.ts                      # security headers, CSP
└── README.md
```

**Routing note:** the dashboard lives at the root of `admin.beyondai.ph`, so pages are `/leads` rather than `/admin/leads`. Admin APIs stay under `/api/admin/` so they are easy to find and protect.

---

## 9. Data model

### 9.1 Enums

- `LeadStatus`: `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`
- `Topic`: `BOOK_CONSULTATION`, `PRODUCT_DEMO`, `AI_EDUCATION`, `CORPORATE_TRAINING`, `PARTNERSHIP`, `TECHNICAL_SUPPORT`, `OTHER`
- `Role`: `STAFF`, `ADMIN`

The UI labels come from `lib/validation/options.ts`, so the public form and the dashboard use the same wording.

### 9.2 Tables

**Lead**

| Column | Type | Notes |
|---|---|---|
| id | string (cuid) | Primary key |
| fullName | string | |
| workEmail | string | Indexed |
| organization | string, nullable | |
| topic | Topic | Indexed |
| interestAreas | string[] | Values from the interest list |
| preferredCallTime | timestamptz, nullable | Stored in UTC, displayed in Manila time |
| message | text | Max 2000 characters |
| consentAt | timestamptz | When consent was given |
| consentVersion | string | Version of the privacy notice shown |
| status | LeadStatus | Default `NEW`, indexed with `createdAt` |
| ownerId | string, nullable | Staff user |
| replyDueAt | timestamptz | `createdAt + 24h` |
| firstContactedAt | timestamptz, nullable | Set on first move to `CONTACTED` |
| sourcePage | string, nullable | Page path where the form was submitted |
| utmSource, utmMedium, utmCampaign | string, nullable | Campaign tracking |
| createdAt, updatedAt | timestamptz | |
| deletedAt | timestamptz, nullable | Soft delete |

**LeadNote**: id, leadId, authorId, body (text), createdAt.

**LeadActivity**: id, leadId, actorId, action (`created`, `status_changed`, `owner_changed`, `note_added`, `deleted`, `restored`), detail (JSON with before and after values), createdAt. This table is append-only. The application never updates or deletes rows in it.

**User**: id, email (unique), name, role, active, createdAt, lastSignInAt. Staff are added by an admin.

The full Prisma schema lives in `prisma/schema.prisma`.

---

## 10. API reference

Base URL: `https://admin.beyondai.ph` (production), `https://admin-staging.beyondai.ph` (staging).

All responses are JSON. Errors use one shape:

```json
{ "error": "validation_failed", "fields": { "workEmail": "Enter a valid email address" } }
```

### 10.1 Public

**POST `/api/leads`**

Request body:

```json
{
  "fullName": "Maria Santos",
  "workEmail": "maria@example.com",
  "organization": "Example Corp",
  "topic": "PRODUCT_DEMO",
  "interestAreas": ["ERP", "HRM_SOFTWARE"],
  "preferredCallTime": "2026-10-22T14:00:00+08:00",
  "message": "We are looking at replacing our HR system next quarter.",
  "consent": true,
  "consentVersion": "2026-10",
  "turnstileToken": "...",
  "companyUrl": "",
  "sourcePage": "/contact",
  "utm": { "source": "linkedin", "medium": "social", "campaign": "q4-launch" }
}
```

| Status | When | Response |
|---|---|---|
| 201 Created | Saved | `{ "id": "...", "status": "NEW", "replyDueAt": "..." }` |
| 400 Bad Request | Validation failed | `{ "error": "validation_failed", "fields": {...} }` |
| 403 Forbidden | Turnstile check failed, or origin not allowed | `{ "error": "verification_failed" }` |
| 413 Payload Too Large | Body over 16 KB | `{ "error": "payload_too_large" }` |
| 429 Too Many Requests | Rate limit hit | `{ "error": "rate_limited" }` with `Retry-After` header |
| 500 Internal Server Error | Unexpected failure | `{ "error": "server_error" }` (details are logged, not returned) |

When the honeypot field is filled, the endpoint returns `201` with a fake ID and saves nothing. This avoids telling bots they were caught.

**OPTIONS `/api/leads`**

Handles the CORS preflight from beyondai.ph. Returns the allowed origin, methods, and headers. Responds only to origins in `CORS_ALLOWED_ORIGINS`.

**GET `/api/health`**

Returns `200` with `{ "ok": true }` and does not touch lead data. Used by uptime checks.

### 10.2 Admin (session required, role checked on every request)

| Method | Path | Purpose | Role |
|---|---|---|---|
| GET | `/api/admin/overview` | Counts for the dashboard overview and header | Staff, Admin |
| GET | `/api/admin/leads` | List with filters, search, pagination | Staff, Admin |
| GET | `/api/admin/leads/[id]` | Lead with notes and activity | Staff, Admin |
| PATCH | `/api/admin/leads/[id]` | Change status or owner (logs activity) | Staff, Admin |
| POST | `/api/admin/leads/[id]/notes` | Add a note | Staff, Admin |
| DELETE | `/api/admin/leads/[id]` | Soft delete | Admin |
| GET | `/api/admin/leads/export` | CSV of filtered leads | Staff (own view), Admin (all) |
| GET | `/api/admin/users` | List staff accounts | Admin |
| POST | `/api/admin/users` | Add an email to the allowlist | Admin |
| PATCH | `/api/admin/users/[id]` | Change role or activate and deactivate | Admin |

List query parameters: `status`, `topic`, `ownerId`, `overdue=true`, `from`, `to`, `q`, `page`, `pageSize`, `sort`.

PATCH body example:

```json
{ "status": "CONTACTED", "ownerId": "usr_123" }
```

The PATCH handler accepts only the fields it expects, checks that each status change is allowed, and writes one activity row per change in the same database transaction.

---

## 11. Changes to the public website

The public site (beyondai.ph) needs only these changes. It does not gain any admin code.

1. **Contact form submission** posts to the enquiry API instead of sending email:
   ```ts
   fetch(`${process.env.NEXT_PUBLIC_ENQUIRY_API_URL}/api/leads`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(payload),
   });
   ```
2. **Turnstile widget** added to the form. Its token is sent in the request body as `turnstileToken`.
3. **Consent checkbox** added (the current page does not show one in the page text I reviewed). It links to the privacy notice.
4. **Honeypot field** added, hidden from people and named `companyUrl`.
5. **Environment variables** added to the public site: `NEXT_PUBLIC_ENQUIRY_API_URL` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
6. **Error and success states** wired to the API responses in section 10.1.

The public site stores no enquiry data and holds no database credentials.

---

## 12. Security

### 12.1 Public endpoint

1. **CORS:** Only origins listed in `CORS_ALLOWED_ORIGINS` (for example `https://beyondai.ph` and `https://www.beyondai.ph`, plus the staging origin) receive a CORS response. Requests from other origins are refused.
2. **Input validation:** Zod schema, length limits, and strict enum checks. Unknown fields are rejected.
3. **Honeypot:** The hidden `companyUrl` field must be empty.
4. **Turnstile:** The server verifies the token with Cloudflare before saving. The token is single-use, so replays fail.
5. **Rate limiting:** Per IP, for example 5 submissions per 10 minutes, plus a daily cap.
6. **Body size limit:** Reject request bodies over 16 KB.
7. **No enumeration:** Error messages are generic. The response never reveals whether an email already exists.
8. **Content handling:** Stored text is never rendered as HTML. React escapes output by default. Do not use `dangerouslySetInnerHTML` for lead data.

### 12.2 Admin dashboard and admin API

1. **Authentication:** Staff sign in through Auth.js (or Clerk). Sessions use HTTP-only, secure, same-site cookies scoped to `admin.beyondai.ph`.
2. **Authorization:** Middleware redirects unauthenticated requests to `/login` for dashboard pages and returns `401` for `/api/admin/*`. Each admin route handler also checks the session and role. Middleware alone is not enough.
3. **CORS for admin routes:** Admin endpoints do not send CORS headers. Only the dashboard, on the same origin, calls them.
4. **Invite-only:** Staff accounts come from the allowlist in the database. Inactive accounts cannot sign in.
5. **Generic sign-in responses:** The login page gives the same message whether or not an email is allowlisted.
6. **MFA:** Enabled if the auth provider supports it. Required for admins.
7. **Least privilege:** Staff cannot delete leads, export all leads, or manage users. Admins can.
8. **CSRF:** Same-site cookies plus state-changing requests limited to POST, PATCH, and DELETE. Add an anti-CSRF token if the auth library does not provide one.
9. **Separate secrets:** The admin app has its own `AUTH_SECRET` and database credentials. Nothing is shared with the public site.

### 12.3 Application-wide

- **Security headers** in `next.config.ts`: `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'` (in CSP), and a Content Security Policy. The admin app should not be embeddable in any frame.
- **Secrets** live in environment variables or the hosting platform's secret store. They are never committed. `.env.example` lists names only.
- **Database access** uses a dedicated role with only the permissions the app needs. The migration role is separate.
- **Dependency checks:** `npm audit` in CI and Dependabot or Renovate enabled.
- **Logging:** Logs never contain the message body, email addresses, or phone numbers. The logger redacts these fields.
- **Error tracking:** Sentry with PII scrubbing. Request bodies are not sent.
- **Optional extra layer:** Vercel Deployment Protection or a Cloudflare Access policy in front of `admin.beyondai.ph`, so only staff networks or identities can reach the login page at all.

---

## 13. Privacy and compliance

This project stores personal data from visitors in the Philippines and potentially from the UK and EU, since the contact page lists a UK phone number and serves international clients. Confirm the final approach with legal or privacy counsel before launch.

### 13.1 Consent

- The form has an unchecked consent checkbox linked to the privacy notice at https://beyondai.ph/privacy.
- The API rejects a submission unless consent is `true`.
- Each lead stores `consentAt` and `consentVersion`, so you can show what the visitor agreed to and when.
- If the privacy notice changes, increase `consentVersion`. Existing records keep their original version.

### 13.2 Data minimization

- Collect only the fields listed in section 4.1.
- Do not store IP addresses in the lead record. If rate limiting needs them, store a salted hash for a short window only.
- Do not send lead data to analytics tools. Analytics should use aggregate counts only.

### 13.3 Retention and deletion

| Data | Retention (proposed) |
|---|---|
| Active leads (New, Contacted, Qualified) | Until resolved, then reviewed each year |
| Won and Lost leads | 2 years after last update |
| Soft-deleted leads | 30 days, then permanently removed |
| Activity log | Same as the lead it belongs to |
| Application logs | 30 days |

Retention periods are placeholders until confirmed by the business. A scheduled job enforces them.

### 13.4 Data subject requests

- An admin can search for a person by email and export all their data as JSON.
- An admin can permanently delete a person's data on request. Deletion removes the lead, notes, and activity entries, and writes an entry to a deletion log that contains no personal data.
- Each request and its completion date are recorded.

---

## 14. Configuration

### 14.1 Admin application environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres connection string |
| `DIRECT_URL` | Yes (migrations) | Direct Postgres connection for migrations |
| `AUTH_SECRET` | Yes | Session signing secret (generate per environment) |
| `AUTH_URL` | Yes | Public base URL of the admin app |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated origins allowed to POST enquiries, for example `https://beyondai.ph,https://www.beyondai.ph` |
| `TURNSTILE_SECRET_KEY` | Yes | Turnstile secret key (server only) |
| `CONSENT_NOTICE_VERSION` | Yes | Current privacy notice version, for example `2026-10` |
| `UPSTASH_REDIS_REST_URL` | Optional | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Rate limiting |
| `SENTRY_DSN` | Optional | Error monitoring |
| `ADMIN_SEED_EMAILS` | Yes (first setup) | Initial staff allowlist, used by the seed script only |

### 14.2 Public website environment variables (added)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_ENQUIRY_API_URL` | Base URL of the admin app, for example `https://admin.beyondai.ph` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (public) |
| `CONSENT_NOTICE_VERSION` | Must match the admin app's value, so the form sends the current version |

### 14.3 Environments

| Environment | Admin domain | Public site calls | Database | Purpose |
|---|---|---|---|---|
| Local | `localhost:3001` | `localhost:3000` | Local Postgres or dev branch | Development and tests |
| Preview | Vercel preview URL | Preview of the public site | Staging database | Pull request review |
| Staging | `admin-staging.beyondai.ph` | Staging site | Staging database | Team testing before release |
| Production | `admin.beyondai.ph` | `beyondai.ph` | Production database | Live |

Each environment has its own secrets, Turnstile keys, and database. Never share production credentials with other environments.

---

## 15. Local development

### 15.1 Prerequisites

- Node.js 20 or later
- pnpm (this project uses pnpm)
- A local Postgres instance or a development database from Supabase or Neon
- Git

### 15.2 Setup

```bash
# 1. Clone and install
git clone <repo-url> beyondai-admin
cd beyondai-admin
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET, CORS_ALLOWED_ORIGINS,
# and the Turnstile test keys

# 3. Create the database schema
pnpm prisma migrate dev

# 4. Add sample enquiries and a test staff account
pnpm prisma db seed

# 5. Start the admin app on port 3001
pnpm dev --port 3001
```

Run the public website separately on port 3000 with `NEXT_PUBLIC_ENQUIRY_API_URL=http://localhost:3001`.

Then open:

- Dashboard: http://localhost:3001
- Public contact page: http://localhost:3000/contact

### 15.3 Useful scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Start the development server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Unit and API tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm prisma migrate dev` | Create and apply a migration locally |
| `pnpm prisma migrate deploy` | Apply migrations (CI and production) |
| `pnpm prisma db seed` | Seed development data |

Turnstile provides test keys for local development. They always pass verification, so test the rejection path separately.

---

## 16. Testing strategy

| Level | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Zod schemas, deadline calculation, status transition rules, overdue logic, log redaction |
| API | Vitest with a test database | `POST /api/leads` (valid, invalid, honeypot, rate limit, Turnstile failure, disallowed origin), admin routes (unauthenticated, staff, admin, cross-role access) |
| Component | Vitest with Testing Library | Form validation messages, status dropdown, filters |
| Cross-app | Playwright | Public form on a local beyondai.ph build posts to the admin API and the lead appears in the dashboard |
| End-to-end | Playwright | Sign in as staff, find the new enquiry, change its status, add a note, check the activity log |
| Accessibility | axe in Playwright | Public form and dashboard pages |
| Security | Manual checklist before launch | Admin routes without a session, IDOR (changing a lead ID to read another lead), CORS from an unlisted origin, injection in search and filters |

Coverage target: 80 percent for `lib/leads/` and `lib/validation/`.

Every pull request runs lint, typecheck, unit and API tests, and the build. End-to-end tests run on preview deployments.

---

## 17. Deployment

Two projects deploy independently:

- **Public website:** existing pipeline. It gains the new environment variables and the form change.
- **Admin application:** new Vercel project, connected to this repo.

Release steps for the admin application:

1. Push a branch and open a pull request. Vercel creates a preview deployment against the staging database.
2. Merge to `staging`. Run the smoke test (section 18.4) against `admin-staging.beyondai.ph` with the staging public site.
3. Merge to `main`. The build runs `prisma migrate deploy` before the new version receives traffic.
4. Smoke test production from an internal address: submit an enquiry from the public site, confirm it appears in the dashboard, then soft-delete it.

Rollback: revert the admin deployment to the previous version in Vercel. Migrations are additive first, so the previous version still works with the new schema. Destructive changes wait until a later release.

Domain setup:

- `admin.beyondai.ph` points to the admin application.
- `admin-staging.beyondai.ph` points to staging.
- The public site keeps `beyondai.ph`.

Order matters: deploy the admin application first, confirm the API responds, then ship the public site change that uses it.

---

## 18. Operations and runbooks

### 18.1 Backups

- Enable automated daily backups and point-in-time recovery on the database provider.
- Test a restore to a separate database once before launch and once a quarter after that.
- Record the last successful restore test in this README.

### 18.2 Monitoring

- Sentry alerts for server errors on `/api/leads` and `/api/admin/*`.
- Uptime checks on `/api/health` for the admin app and on `/contact` for the public site.
- Daily count of enquiries. Alert if it drops to zero for a full business day, since that can mean the form or the CORS setting is broken.

### 18.3 Common issues

| Symptom | Likely cause | Action |
|---|---|---|
| Visitors see "something went wrong" on submit | API error, or CORS origin not in the allowlist | Check the browser console for CORS errors; check Sentry; confirm `CORS_ALLOWED_ORIGINS` |
| No new enquiries for a day | Form broken, Turnstile key mismatch, or rate limit too strict | Submit a test enquiry; check Turnstile dashboard; check rate limit logs |
| Staff cannot sign in | Account inactive or missing from the allowlist | Admin re-activates the account or adds the email |
| Many spam enquiries | Turnstile bypass or rate limit too loose | Tighten rules; review honeypot hits |
| Overdue enquiries piling up | Staff capacity or ownership gap | Use the overdue filter; reassign owners |
| Public site deploy broke the form | Missing `NEXT_PUBLIC_ENQUIRY_API_URL` | Set the variable and redeploy the public site |

### 18.4 Release smoke test

- [ ] Public contact page loads and the form renders
- [ ] Submitting with missing fields shows field errors
- [ ] Valid submission returns the confirmation
- [ ] The new enquiry appears in the dashboard within a few seconds
- [ ] Status change is saved and appears in the activity log
- [ ] Note is saved and appears in the timeline
- [ ] Unauthenticated request to `/leads` redirects to `/login`
- [ ] Unauthenticated request to `/api/admin/leads` returns `401`
- [ ] A request to `/api/leads` from an unlisted origin is refused
- [ ] Staff cannot access the delete action
- [ ] CSV export downloads with the expected columns

---

## 19. Roadmap

Each phase has a checklist. Phases run in order.

### Phase 0: Decisions and setup (half a day)

- [ ] Confirm the admin domain (`admin.beyondai.ph`) and staging domain
- [ ] Confirm auth provider (Auth.js or Clerk)
- [ ] Confirm database provider (Supabase or Neon)
- [ ] Create staging and production databases
- [ ] Create the Turnstile site and keys
- [ ] Confirm consent wording with legal or privacy contact
- [ ] Confirm retention periods (section 13.3)
- [ ] Create the admin repository, branch protection, and CI pipeline
- [ ] Create the admin Vercel project

### Phase 1: Data layer (1 day)

- [ ] Prisma schema and first migration
- [ ] Seed script with sample enquiries across topics and statuses
- [ ] `lib/validation/` schemas and option lists
- [ ] `lib/leads/deadlines.ts` with unit tests

### Phase 2: Enquiry API (2 to 3 days)

- [ ] `POST /api/leads` with validation, honeypot, and Turnstile
- [ ] CORS allowlist and preflight handling
- [ ] Rate limiting and body size limit
- [ ] `GET /api/health`
- [ ] API tests for all response codes
- [ ] Deploy the admin app to staging and confirm the API responds

### Phase 3: Public website integration (1 to 2 days)

- [ ] Add the consent checkbox, honeypot, and Turnstile widget to the contact form
- [ ] Post to the enquiry API and remove the email call
- [ ] Wire error and success states to the API responses
- [ ] Add the new environment variables to the public site
- [ ] Cross-app test on staging

### Phase 4: Authentication and access (2 days)

- [ ] Auth provider configured with invite-only access
- [ ] Sign-in and sign-out pages
- [ ] `middleware.ts` protecting dashboard pages and `/api/admin/*`
- [ ] Role checks in each admin route handler
- [ ] Tests for unauthenticated, staff, and admin access

### Phase 5: Admin API (2 to 3 days)

- [ ] List endpoint with filters, search, and pagination
- [ ] Detail endpoint with notes and activity
- [ ] PATCH endpoint with transition rules and transactional activity logging
- [ ] Notes endpoint
- [ ] Soft delete (admin only)
- [ ] CSV export
- [ ] Users endpoints (admin only)

### Phase 6: Dashboard UI (3 to 4 days)

- [ ] Layout with sidebar and header count of New enquiries
- [ ] Overview page with counts and topic breakdown
- [ ] Enquiry list with filters, search, sorting, and overdue badges
- [ ] Enquiry detail with status, owner, notes, and activity
- [ ] Users page (admin only)
- [ ] Empty, loading, and error states

### Phase 7: Hardening and privacy (2 days)

- [ ] Security headers and CSP
- [ ] Sentry with PII scrubbing
- [ ] Retention job
- [ ] Data subject export and deletion procedure
- [ ] Logger redaction tests
- [ ] Optional access layer in front of the admin domain

### Phase 8: Testing and launch (2 days)

- [ ] End-to-end tests for the main flows
- [ ] Accessibility checks
- [ ] Manual security checklist
- [ ] Backup restore test
- [ ] Staff training session on the dashboard
- [ ] Release smoke test on production, then ship the public site change

### Milestones

| Milestone | Target | Done when |
|---|---|---|
| MVP | About week 1 to 2 | Public form saves enquiries with consent; staff can sign in, view the list, and change status |
| Usable v1 | About week 2 to 3 | Notes, filters, search, overdue tracking, activity log, and CSV export are live |
| Production | About week 3 to 4 | Hardening, tests, monitoring, retention, and training are complete |

### Later (not in version 1)

- Email or Slack notification to the right team by topic
- Assignment rules (for example, all Product demo enquiries go to a named owner)
- Calendar integration for preferred call times
- Import of older enquiries from email
- Move the API to its own subdomain (`api.beyondai.ph`) if other clients need it

---

## 20. Open decisions

| Decision | Options | Owner | Status |
|---|---|---|---|
| Admin domain | `admin.beyondai.ph` or another subdomain | Engineering | Open |
| Auth provider | Auth.js (self-hosted, free) or Clerk (managed, paid tiers) | Engineering | Open |
| Database | Supabase or Neon | Engineering | Open |
| Rate limiting | Upstash or Cloudflare rules | Engineering | Open |
| Access layer for admin | None, Vercel Deployment Protection, or Cloudflare Access | Engineering and management | Open |
| Consent wording | Final text for the checkbox | Legal or privacy contact | Open |
| Retention periods | Confirm section 13.3 values | Management | Open |
| Staff list | Names and emails for the allowlist | Management | Open |
| Admin role holders | Who can delete and export | Management | Open |
| Ownership of the 24-hour promise | Who monitors overdue enquiries daily | Management | Open |
| Preferred call time handling | Free text or time picker with time zone | Product | Open |
| Hosting account | Vercel team account and billing owner | Engineering | Open |

---

## 21. Glossary

- **Enquiry / Lead:** A visitor's submission through the contact form.
- **Activity log:** Append-only record of every change to a lead.
- **CORS:** Browser rule that controls which websites may call an API. Here, only beyondai.ph may submit enquiries.
- **Honeypot:** A hidden form field that people do not see but bots fill in. A filled field signals a bot.
- **Turnstile:** Cloudflare's bot-check service, which usually runs without showing puzzles to users.
- **Overdue:** An enquiry that has passed its 24-hour reply deadline without a first contact.
- **Soft delete:** Marking a record as deleted without removing it from the database, so it can be restored.
- **Data subject request:** A request from a person to access, correct, or delete their personal data.
