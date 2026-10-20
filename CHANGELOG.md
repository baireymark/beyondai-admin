# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Public enquiry endpoint `POST /api/leads` with CORS allowlist and preflight, 16 KB body limit, per-IP rate limits, honeypot, strict validation, and Cloudflare Turnstile verification.
- Postgres data model (Prisma 7): leads, notes, an append-only activity log enforced by a database trigger, staff users, Auth.js tables, and a privacy log.
- Invite-only staff sign-in with Auth.js email links and database sessions, with the same response for every email.
- Admin API under `/api/admin/`: overview counts, lead list with filters, search, sorting, and pagination, lead detail, status and owner changes, notes, soft delete and restore, CSV export, and staff management.
- Dashboard: overview with counts and a topic breakdown, enquiry list with overdue enquiries first, enquiry detail with status, owner, notes, and history, a users page, and a privacy page. New and overdue counts in the header refresh every minute.
- Data subject export and permanent erasure, and a daily retention job.
- PII-redacting JSON logger, CSV formula-injection protection, and startup validation for every environment variable.
- Seed script for the first admins and sample data.
- API tests against a real database, and E2E tests for the main flows in three browsers with accessibility and CSP checks.
- BeyondAi branding: logo mark and wordmark in the sidebar and on the sign-in page, a matching favicon, and an orange and purple-navy colour scheme.
- Light and dark themes with a System / Light / Dark switch in the header and on the sign-in page. The choice is saved in a cookie and rendered on the server, so pages load in the right theme with no flash.

### Changed

- Started from the team's Next.js boilerplate; its example contact form and status card were removed.
- `GET /api/health` returns `{ "ok": true }`.
- The app runs on port 3001 locally, next to the public site on port 3000.
