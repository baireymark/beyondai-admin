# 0002. Nonce-based Content Security Policy

- Status: accepted
- Date: 2026-10-14

## Context

The proposal requires a strict Content Security Policy with no inline scripts. Next.js injects inline scripts for hydration, so a strict policy must allow them by nonce or by hash.

## Decision

`proxy.ts` generates a fresh nonce for each request and sends a policy with `'nonce-…'` and `'strict-dynamic'`. Next.js reads the nonce from the request header and applies it to its scripts. The root layout calls `connection()` so every page renders per request.

## Consequences

- No page is statically prerendered, which adds server work per request.
- Development adds `'unsafe-eval'` and `'unsafe-inline'` for styles, which React's dev tooling needs. Production never includes them. A unit test (`proxy.test.ts`) and an E2E test check this.

## Alternatives rejected

- No CSP, or one with `'unsafe-inline'`: fails the security baseline.
- Hash-based CSP with static pages: keeps static rendering, but the hashes must be regenerated for every build and break easily. Revisit this if static performance becomes a priority.
