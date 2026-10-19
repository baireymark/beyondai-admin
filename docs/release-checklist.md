# Release checklist

Before promoting a build to production:

1. CI is green on `main`: lint, types, unit and API tests, E2E, accessibility, Lighthouse, and Storybook.
2. New environment variables are set in every environment and listed in `.env.example`.
3. Migrations are additive, so the previous release still works with the new schema and a rollback is safe. Destructive changes wait for a later release.
4. `CHANGELOG.md` has an entry for the release.
5. The rollback path is known: promote the previous deployment in Vercel.

## Smoke test (staging, then production)

Run these against `admin-staging.beyondai.ph` with the staging public site, then against production from an internal address.

- [ ] `GET /api/health` returns `{"ok":true}`
- [ ] The public contact page loads and the form renders
- [ ] Submitting with missing fields shows field errors
- [ ] A valid submission shows the confirmation
- [ ] The new enquiry appears in the dashboard within a few seconds
- [ ] A status change is saved and appears in the activity log
- [ ] A note is saved and appears in the timeline
- [ ] Signed out, `/leads` redirects to `/login`
- [ ] Signed out, `/api/admin/leads` returns `401`
- [ ] `POST /api/leads` from an unlisted origin is refused (`403`)
- [ ] Staff cannot see the delete action
- [ ] The CSV export downloads with the expected columns
- [ ] In production: soft-delete the test enquiry afterwards

After release, watch the logs for new errors, and confirm the daily enquiry count does not drop to zero.
