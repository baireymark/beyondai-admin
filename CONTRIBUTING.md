# Contributing

## Workflow

1. Branch from `main` with a short name, such as `feat/invoice-export` or `fix/login-redirect`.
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/), for example `feat: add invoice export`. A commit hook checks the message.
3. Update `CHANGELOG.md` and any affected docs in the same pull request as the code.
4. Open a pull request using the template. Every CI check must pass before merge.
5. Squash-merge once a reviewer approves. Read and resolve automated review comments first.

The pre-commit hook lints, formats, and type-checks staged files. Do not bypass it with `--no-verify`.

## Definition of done

- The behavior is covered by tests at the cheapest layer that proves it.
- Lint, type check, unit, E2E, accessibility, and Lighthouse checks pass in CI.
- New UI works with a keyboard and has accessible names for controls.
- No secrets in code, commits, or logs. Use environment variables listed in `.env.example`.
- Docs and the changelog describe the change.

## Code review

Reviewers check correctness, edge cases, security (input validation at the server, no secrets, no personal data in logs), accessibility, and whether the change respects module boundaries.
