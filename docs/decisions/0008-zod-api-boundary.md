# ADR-0008: Runtime validation of API responses with zod

**Status:** Accepted

**Date:** 2026-06-11

**Authors:** Ali, with Claude consulting

---

## Context

The frontend trusts every backend response blindly: `lib/api.ts` casts
`res.json()` straight to the expected TypeScript type. TypeScript types are
erased at runtime, so a backend change, a proxy error page, or a malformed
response flows into cap-table rendering unchecked. For software whose output
has legal weight, the API boundary should verify what it receives.

The June 2026 architectural review (Phase 1 findings M1–M3) mandated runtime
validation of all API responses. Hand-rolling type guards for ~40 response
shapes was considered and rejected: it duplicates every type definition,
drifts silently, and is the kind of mechanical code humans maintain badly.

## Decision

Adopt **zod** as the single runtime-validation library at the API boundary:

- Response schemas live in `frontend/src/lib/api/schemas/`, one module per
  domain. TypeScript types are inferred from schemas (`z.infer`), so the type
  and the validation can never disagree.
- Validation happens once, inside the transport layer — components never
  import zod.
- Scope is bounded: zod validates API I/O. It is not a form library, not a
  state-management tool, and must not spread into component props.

Installation happens during the API-hardening step of the active refactor
(Step 7), not before; this ADR records the decision and its boundaries.

## Consequences

- One new production dependency (~2 kB gzipped core path, zero transitive
  dependencies). Permitted under the CLAUDE.md rule that new libraries
  require an ADR — this is that ADR.
- Malformed responses fail loudly at the boundary with a typed error instead
  of surfacing as `undefined is not a function` mid-render.
- Until Step 7 lands, the existing trusted casts remain and are marked with
  explanatory comments referencing this ADR.
