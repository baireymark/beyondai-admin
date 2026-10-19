# 0001. Frontend stack

- Status: accepted
- Date: 2026-10-14

## Context

New web apps need a shared starting point so teams build features instead of tooling. The boilerplate proposal set the requirements: strict typing, tested defaults, accessibility, performance, and security baselines.

## Decision

Next.js 16 with the App Router, React 19, TypeScript in strict mode, Tailwind CSS 4, TanStack Query for client-side server state, Zustand for shared UI state, Zod for runtime validation, and npm as the package manager.

## Consequences

- One framework covers routing, rendering, and API routes.
- Server Components keep client JavaScript small by default.
- Developers need to understand the server and client component boundary.

## Alternatives rejected

- The Pages Router: older model, no Server Components.
- CSS Modules: more custom CSS to keep consistent across teams.
