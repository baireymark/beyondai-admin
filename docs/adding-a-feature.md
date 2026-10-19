# Adding a feature

This walkthrough adds a feature called `reminders`. Copy the pattern from `features/leads` (server functions, Server Actions, and components) or `features/users` (a small admin feature).

1. Create the folder `features/reminders/` with these files as needed:
   - `schema.ts` for Zod schemas and the types inferred from them. Client components must not import a file that uses classic `zod`; put labels and option lists they need in a separate file such as `options.ts`, and use `zod/mini` for schemas that run in the browser (see `features/leads/api.ts`).
   - `server/*.ts` for data access and business rules. Start each file with `import 'server-only'`, take the acting user as a parameter, and return a `Result` (`shared/lib/result.ts`) for expected failures.
   - `actions.ts` for Server Actions, starting with `'use server'`. Each action calls `requireUser()` or `requireAdmin()` from `@/features/auth/server` first.
   - `api.ts` for TanStack Query hooks, only if the browser fetches data itself.
   - `components/` for the feature's components.
2. Export the public pieces: client-safe ones from `features/reminders/index.ts`, server-only ones from `features/reminders/server.ts`. Everything else stays private to the feature.
3. Add routes in `app/`. Pages under `app/(dashboard)/` call `requireUser()` or `requireAdmin()`. Route handlers under `app/api/admin/` start with `authorizeApi(request)`, read bodies with `readJsonBody`, and return errors with `jsonError` or `failureResponse`.
4. If you change the database, edit `prisma/schema.prisma` and run `npm run db:migrate -- --name <change>`. Keep migrations additive so the previous release keeps working.
5. Write tests at the cheapest layer that proves the behavior: schema and helper tests next to the code, route handler tests in `tests/api/` (they run against the test database), and an E2E test in `tests/e2e/` for the main journey, with `checkA11y()` on each new page.
6. If you added environment variables, add them to `config/env.ts` and `.env.example`.
7. Run `npm run lint && npm run typecheck && npm test` before pushing.

If two features need the same code, move it to `shared/` instead of importing one feature's internals from another.
