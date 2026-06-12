# ADR-0007: Reconcile documented frontend stack with Next.js 16

**Status:** Accepted

**Date:** 2026-06-11

**Authors:** Ali, with Claude consulting

---

## Context

ADR-0002 and CLAUDE.md locked the frontend stack at "Next.js 15". During the
June 2026 architectural review, the installed and deployed version was found to
be Next.js 16.2.6 (verified against `frontend/node_modules` and
`frontend/package.json`, which declares `next: ^16.2.6`). The upgrade was made
during normal development but never reflected in the project documents,
leaving the docs asserting a version the product does not run.

Two secondary observations from the same review:

- `react` / `react-dom` are pinned to exactly `19.0.0` while Next 16 develops
  against newer React 19.x patch lines. No incompatibility has been observed,
  but the pin should be reviewed when dependencies are next touched.
- The documented option "Tailwind" was never adopted; the shipped styling
  approach is vanilla CSS with the design tokens in
  `frontend/src/app/globals.css`.

## Decision

Accept Next.js 16 as the current locked frontend framework version. Update
CLAUDE.md and `.agents/rules/01-project-rules.md` to state Next.js 16 and to
record vanilla CSS + design tokens as the styling approach. Future major
framework upgrades require their own ADR before the upgrade, not after.

## Consequences

- Documentation and reality agree again; agents and new contributors stop
  receiving a false constraint.
- The React 19.0.0 pin is flagged for review during the TypeScript/dependency
  hardening step of the active refactor (no change made now).
- No code changes result from this ADR; it is a documentation correction.
