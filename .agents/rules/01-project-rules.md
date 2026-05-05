---
trigger: always_on
---

# 01 Capital Project Rules

This workspace is for building cap table and equity management software for Saudi startups under the 01 Capital brand.

## Project identity

- Product type: Cap table / equity management SaaS for Saudi-domiciled companies
- Brand: 01 Capital
- Product posture: serious, compliance-grade, professional B2B tool
- Primary users in V1: Saudi startup founders and CFOs managing their own equity
- Geographic focus: Saudi Arabia first; other GCC markets are out of scope for MVP
- Build quality goal: production-aware, modular, scalable, legally defensible

## What this product is NOT

- Not a stock trading platform (the previous direction — fully deprecated)
- Not a brokerage system
- Not a general accounting / ERP system
- Not a multi-jurisdiction tool
- Not AI-driven at its core. The cap table is deterministic. AI is allowed only for narrow optional explanation tasks.

## Locked decisions (do not relitigate without an ADR)

- **Pivot from stock platform to cap table software**: see `docs/decisions/0001-pivot-to-cap-table.md`
- **Saudi-first**: Companies Law 2023 is the legal substrate. SJSC + LLC + future entity types as they're added to the law.
- **Discovery before build**: no feature code until validation gates pass. See `docs/discovery/14-day-sprint.md`.
- **English for team docs, bilingual for research and customer-facing artifacts**

## Technical stack

- Frontend: Next.js 15 + TypeScript + Tailwind (or vanilla CSS with design tokens)
- Backend: FastAPI + Python 3.12
- Database: PostgreSQL
- Cache: Redis (when needed; not on day one)
- Workers: background recalculation, event ingestion, notification delivery
- Architecture: monorepo, modular, NOT microservices on day one
- Deployment: Dockerized, cloud target TBD (likely AWS Bahrain or local Saudi cloud per data residency)

## Architecture rules

- The cap table is the source of truth for all equity state.
- Every state-changing operation is an event. Cap table is materialized from event log.
- Provider integrations (e.g., MoC commercial registry, ZATCA, CMA filings) pass through normalization layers and are replaceable.
- AI is not a core dependency. Any AI feature must be optional, bounded, and replaceable.
- Multi-tenancy from day one (each customer = one company; users are scoped to companies).
- Audit log everything. Cap table data has legal weight; lose-data-once = lose customer forever.

## Data rules

- Never log or display personal national IDs, IBANs, or other sensitive PII outside protected views.
- Saudi data residency: when in doubt, default to Saudi-hosted infrastructure.
- Document retention follows Saudi corporate law minimums (typically 10 years for corporate records).
- Never auto-generate legal documents (resolutions, share certificates) without a clear "DRAFT — REVIEW WITH LEGAL COUNSEL" watermark.

## Build sequencing rules

- Discovery first, always.
- After discovery: thinnest possible vertical slice (founder logs in, sees their company, adds one shareholder, sees the cap table update).
- After thin slice: add one capability per sprint. Resist parallel feature work.
- Do not introduce a new external service (Redis, S3, etc.) without an ADR justifying it.
- Do not touch ESOP, vesting, or option features until the basic cap table works end to end.

## Current implementation preference

Prefer:
- simple strong defaults
- explicit module boundaries
- realistic sprint planning
- reviewable progress
- clean repo structure
- maintainable code
- bilingual readiness from day one (Arabic + English) even if Arabic UI ships in a later phase
- legal compliance over feature richness

Avoid:
- premature abstractions
- speculative AI integrations
- giant scaffolds with weak reasoning
- random changes not tied to the implementation plan
- treating Saudi Companies Law as a translation layer over a Delaware mental model — the legal models are different, do not paper over the differences

## Expected response style in this workspace

When responding here:
- be technical
- be practical
- be specific
- propose exact build order
- explain tradeoffs when needed
- call out conflicts or weak ideas clearly
- separate now vs later vs avoid
- cite the law (article number) when making compliance claims
- flag explicitly when something needs Saudi lawyer review

No emojis, no decorative stickers, no playful visual metaphors in product UI or product documents.
The UI must remain professional, sharp, technical, and brand-consistent.
The cap table is a legal document in software form. Treat it that way.
