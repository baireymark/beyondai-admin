# 0003. Tooling versions and supply-chain rules

- Status: accepted
- Date: 2026-10-14

## Context

Dependencies are a supply-chain risk, and newly published releases occasionally carry malicious code before anyone notices.

## Decision

- Every dependency is pinned to an exact version (`save-exact` in `.npmrc`).
- A version must be at least 14 days old before adoption. Renovate enforces this with `minimumReleaseAge`.
- GitHub Actions are pinned to commit SHAs, with the tag in a comment.
- npm 11 or newer is required. npm 10.9 crashes while resolving this dependency tree (an Arborist error reading `edgesOut`), so `.npmrc` sets `engine-strict` to fail early with a clear message.
- ESLint stays on version 9 for now. ESLint 10 crashes inside `eslint-plugin-react`, which `eslint-config-next` bundles. Upgrade once `eslint-config-next` supports ESLint 10.
- `playwright-core` is pinned through `overrides` so `@axe-core/playwright` uses the same version as `@playwright/test`.
- CI fails on high or critical advisories in runtime dependencies (`npm audit --omit=dev --audit-level=high`).
- Next.js is on 16.3.8, the patch release that fixes the high-severity advisories affecting 16.0.0 to 16.3.7 (including SSRF in image optimization and cache poisoning).
- Lighthouse CI (`@lhci/cli`) is not a project dependency. Its latest release pulls in an old Lighthouse and Puppeteer chain with known advisories, so `npm run lhci` runs a pinned version through `npx` in CI only. Update the version in the `lhci` script by hand.

## Accepted risk

`braces` 3.0.3, reached only through `eslint-config-next`, has a denial-of-service advisory (GHSA-vfj7-8cjw-p6xm) with no patched release. It runs only at lint time on glob patterns written in this repository, never on user input. Revisit when a fixed version ships; Renovate will raise it.

## Consequences

Upgrades arrive at least two weeks after release, in grouped weekly pull requests that must pass the full pipeline.
