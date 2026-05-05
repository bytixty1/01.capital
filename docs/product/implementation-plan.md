# 01 Capital — Implementation Plan v0.1

> **Status:** Provisional. This plan governs the build only after the 14-day discovery sprint exits with Outcome A (validated). Until then, the only code allowed is foundational scaffolding (auth, DB connection, brand tokens — see Sprint 0 below).
>
> **This document supersedes the old `01 Capital_Stock_Intelligence_Implementation_Plan.pdf`.** That plan is dead.

---

## 1. Executive summary

01 Capital is a cap table and equity management platform built natively around the 2023 Saudi Companies Law. The product gives Saudi founders, CFOs, and corporate counsel a single source of truth for company ownership — designed for SJSCs, LLCs, and (later) JSCs, with first-class support for Saudi-specific instruments (sukuk-convertibles, Sharia-compliant ESOPs), procedures (MoC filings, ZATCA exports), and governance constructs (family business charters, ROFR, drag/tag rights).

**Core philosophy:** the cap table is a legal document in software form. Reliability, auditability, and legal correctness beat feature richness. Every decision is filtered through "would a Saudi corporate lawyer endorse this?"

| Area | Direction |
|------|-----------|
| Primary user (V1) | Saudi startup founder/CFO managing their own company's equity |
| Market scope | Saudi Arabia first; other GCC markets are a V2+ question |
| Product posture | Compliance-grade B2B SaaS, not a consumer product |
| Build philosophy | Discovery → thin vertical slice → expand. No parallel feature work. |
| AI posture | None in core. Optional, narrow, replaceable explanation features only. |
| Data residency | Saudi-hosted by default once we have customer data |
| Bilingual | English + Arabic from day one in research and customer-facing artifacts; Arabic UI is V1.5 |
| Pricing model (provisional) | Per-company subscription, tiered by stakeholder count + entity type complexity. To be validated. |

**Core principle:** the cap table engine is deterministic, event-sourced, and fully auditable. Filings are surfaced and structured but never auto-submitted to regulators in V1.

---

## 2. Product scope

### In scope for V1
- Company creation (LLC, SJSC, or JSC entity types)
- Stakeholder management (founders, employees, investors)
- Share / partner-interest issuance
- Capital change events (issuance, transfer, repurchase, splits)
- ESOP plan setup, grants, vesting tracking, exercise
- Sukuk-convertible instrument support
- Phantom share support
- Document generation (drafts only, watermarked)
- ZATCA-aligned data exports (zakat-year structured)
- MoC filing tracker (surfaces requirements; does not submit)
- Audit log of every state-changing event
- Multi-user access per company with roles (admin, viewer, employee)
- Bilingual product copy (UI in English V1; Arabic UI in V1.5)

### Out of scope for V1
- Direct integration with MoC, ZATCA, or CMA portals (V2+ partnership work)
- Tax computation
- Legal advice generation
- Multi-jurisdiction support (Saudi only)
- Public-listed company workflows (when SJSCs convert to listed JSCs, that's a V2 expansion)
- Family-charter authoring tools (V1 only flags charter presence; V2 authors)
- Investor-side relationship management (CRM for investors)
- Secondary market or share-sale marketplace
- AI-driven recommendations

---

## 3. Architecture

### 3.1 High level

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Frontend   │────▶│  Backend API │────▶│ PostgreSQL │
│  Next.js 15 │     │  FastAPI     │     │            │
└─────────────┘     └──────┬───────┘     └────────────┘
                            │
                    ┌───────┴────────┐
                    │  Worker queue  │
                    │  (Redis/Celery)│
                    └────────────────┘
```

Monorepo. Modular boundaries inside, not microservices.

### 3.2 Critical architectural decisions

**Decision A: Event-sourced cap table.** Every state-changing operation is an immutable event. The current cap table is a materialized view derived from the event log. This is non-negotiable for legal-grade auditability.

ADR to write: `0003-event-sourced-cap-table.md`

**Decision B: Multi-tenancy from day one.** One company = one tenant. Users may belong to multiple companies (e.g., a CFO managing several portfolios). Row-level security at the Postgres layer, not just app-layer checks.

ADR to write: `0005-multi-tenancy-model.md`

**Decision C: Provider abstraction for future regulatory integrations.** Even though MoC/ZATCA/CMA integrations are V2+, the architecture must allow them to slot in cleanly. Filing-export adapters defined as interfaces in V1 and stubbed.

**Decision D: Saudi-hosted infrastructure once we have customer data.** Development can run anywhere, but production data must comply with whatever data-residency expectations our customers and their lawyers raise. Default to AWS Bahrain region, validate during legal advisor conversations.

ADR to write: `0006-data-residency.md`

### 3.3 Data model overview

Reference the law digest's Section J for the full model. Key entities:

- **Company** (entity_type, AoA flags, capital structure)
- **Stakeholder** (person/entity, nationality, role)
- **Holding** (security type, quantity, vesting, restrictions)
- **VestingSchedule** (cliff, period, type)
- **Event** (the audit log — every change captured)
- **FilingRecord** (MoC/CMA/ZATCA tracking)
- **Document** (generated drafts and uploaded files)

---

## 4. Sprint roadmap

**Sprint length:** 2 weeks each. **Team:** 4 founders, but only Abdulelah is full-time on engineering. Yosef, Ali, and Mohammed contribute domain expertise, design, and customer feedback respectively.

### Sprint 0 — Foundation (parallel with Discovery Sprint)

**Already underway during the 14-day discovery sprint.**

Goal: developer can `git clone && docker-compose up` and have a working local environment.

- Monorepo structure
- FastAPI app with health endpoint, Postgres connection, Alembic
- Next.js 15 app with auth-only flows (login, register, logout, /me)
- 01 Capital brand tokens applied (dark surfaces, purple accent)
- Docker compose for local dev
- GitHub Actions CI (lint + test on every PR)
- Initial ADRs (0001, 0002, 0003)

**Gate to Sprint 1:** Discovery sprint exits with Outcome A.

### Sprint 1 — Company & stakeholders (vertical slice)

Goal: founder can create their company, add themselves and their co-founders, see the cap table reflect ownership.

- Company creation flow (entity type picker: LLC / SJSC / JSC)
- AoA-flag capture (drag/tag, ROFR period, profit allocation)
- Stakeholder add/edit/remove
- Founder share issuance
- Cap table view (table format, percentages, basic visualization)
- Audit log of events

**Deliverable:** 01 Capital can model its own cap table in the tool.
**Gate:** at least one design partner (from discovery interviews) confirms the basic model fits their company.

### Sprint 2 — Capital changes

- Share transfer flow (with ROFR enforcement for LLCs)
- Capital increase events
- Capital decrease events
- Multi-class shares (common/preferred for SJSCs)
- Event-sourced state reconstruction

**Deliverable:** founders can simulate/model a fundraising round.

### Sprint 3 — ESOP foundation

- ESOP plan creation (AoA check, EGA resolution template, plan rules)
- Grant management (issue, modify, revoke)
- Vesting engine (cliff + monthly graded default; custom support)
- Exercise tracking
- Termination handling
- Quarterly CMA disclosure pack export

**Deliverable:** 01 Capital can issue ESOP grants to its first hires using the tool.

### Sprint 4 — Filings tracker

- MoC filing detection per cap table event type
- Draft document generation (AoA amendments, capital change resolutions, partner register updates) — watermarked
- Filing status tracking
- Reminder system
- ZATCA-aligned data export

**Deliverable:** the product surfaces compliance work proactively. Founders see what's required, when.

### Sprint 5 — Sukuk-convertibles & sophisticated instruments

- Sukuk-convertible instrument modeling
- Phantom share support
- Anti-dilution protections
- Liquidation preferences (for SJSC preferred shares)

**Deliverable:** product handles real fundraising-stage cap tables, not just simple founder splits.

### Sprint 6 — Multi-user & permissions

- Roles within a company (admin, viewer, accountant, lawyer, employee)
- Employee self-service portal (view your grants, vesting, exercise)
- Audit access logs
- Email notifications

**Deliverable:** a real customer can use the product as a team, not as a single user.

### Sprint 7 — Hardening & first-customer release

- Performance: caching, query optimization
- Observability: structured logging, error tracking, freshness monitors
- Security review with external auditor
- Saudi-hosted production deployment
- First paying customer onboarded (likely a discovery-interview design partner)
- ADR-0010: "MVP shipped"

**Deliverable:** real customer pays real money. Sprint 0 → Sprint 7 = approximately 16 weeks of focused work, assuming Abdulelah full-time and discovery validation cleanly passes.

---

## 5. Technical standards

### Code
- Python 3.12+, FastAPI 0.115+, SQLAlchemy 2.0 async, Pydantic 2
- TypeScript strict mode, Next.js 15, Tailwind or vanilla CSS with design tokens
- Test coverage: 80%+ on domain logic (cap table calculations especially), 50%+ on API routes
- Type safety: no `any` in TypeScript, no untyped Python

### Database
- PostgreSQL 16+
- Migrations via Alembic, never auto-generated commits
- Row-level security for multi-tenancy
- All timestamps in UTC at the DB layer; rendered in user's timezone client-side

### Security
- All secrets in environment variables, never in code
- JWT for stateless auth (V1); session-based as upgrade path
- Rate limiting on auth endpoints from day one
- All input validated server-side via Pydantic
- HTTPS only in production
- Audit log immutable (no UPDATE/DELETE on the events table)

### Observability
- Structured JSON logging
- Every job (even small ones) logs start/end/status/duration/rows-affected
- Error tracking (Sentry or equivalent) from Sprint 1
- Freshness monitors on background workers from Sprint 4

### Engineering hygiene
- Feature branches, PR reviews even when solo (review your own work)
- ADRs for every non-trivial decision
- Vertical slices, not horizontal infrastructure
- No premature abstractions
- No speculative features

---

## 6. Hiring (post-MVP, illustrative)

By the end of Sprint 7, if customer revenue justifies, plausible first hires:

1. **Saudi corporate lawyer** (advisor relationship → fractional → maybe full-time)
2. **Customer success / onboarding** (handles new customer setup, training, pain reports)
3. **Second full-stack engineer** (to give Abdulelah a peer, not a junior)
4. **Sales / business development** (Yosef can't scale alone past ~20 customers)

Mohammed's CDO role expands as the brand needs to support marketing materials, sales decks, and event presence.

Ali's CPO role expands as the product needs to roadmap beyond initial feedback loops.

---

## 7. Success metrics

### V1 success (end of Sprint 7)

- 5+ Saudi companies actively using the product
- At least 2 paying (the others may be design partners on free terms)
- Net Promoter Score > 30 from active users
- Zero data integrity incidents
- Zero legal-correctness disputes (i.e., no customer telling us "your output is wrong per Saudi law")

### V2 success (6 months post-V1)

- 30+ paying customers
- 70%+ MRR retention month-over-month
- 1+ ministry / government program officially recommends 01 Capital to startups
- 1+ Saudi VC firm officially uses 01 Capital for portfolio cap table tracking
- Technical foundation can support 1000+ active companies without re-architecture

---

## 8. Risk register

| Risk | Mitigation |
|------|-----------|
| **Legal incorrectness shipped to a customer** | Lawyer advisor relationship from week 1. Every legally-loaded feature gets reviewed before customer exposure. |
| **EquityList ships SJSC support before us** | Maintain lead on Saudi-specific depth, not breadth. Talk to MENA-credible lawyers they don't have. |
| **Discovery validates pain but not willingness to pay** | Have a frank conversation about pivot vs. lower-revenue niche play vs. acquisition strategy. |
| **Saudi data-residency expectations exceed AWS Bahrain capabilities** | Evaluate STC Cloud, Saudi-licensed providers, and bare-metal options early. |
| **Founder bandwidth: Abdulelah is the only full-time engineer** | Realistic sprint sizing. Hire engineer #2 by end of Sprint 5 if customer pull justifies. |
| **Competitor partnerships with Saudi lawyers** | Build genuinely differentiated relationships, not transactional ones. |
| **AoA reading errors in our customer onboarding** | Manual lawyer review of first 10 customers' AoA capture. Build automation only after the manual process is reliable. |
| **Mission creep from "we should also do X"** | This document is the spec. Anything not in here requires an ADR. |

---

## 9. What this plan deliberately does not say

This plan does **not** say:
- Exactly what the UI looks like (Mohammed's domain)
- Exactly which CSS framework to use (Abdulelah + Mohammed's call)
- Exactly when to onboard customer #1 (depends on discovery outcome quality)
- Exactly how to price (depends on willingness-to-pay signals from discovery)
- Whether to raise funding (separate strategic conversation)

These are intentionally left open. A 16-week plan with 90% certainty everywhere is fiction. A 16-week plan with 60% certainty on direction and rolling adjustments is reality.

---

## 10. Update protocol

This plan changes when:
- A sprint demonstrably proves the next sprint's assumptions wrong
- A customer signal shifts the priority of one workstream over another
- A regulatory change affects what's possible
- A material new competitor appears

Updates require:
- An ADR explaining the change
- Team agreement (not unanimous, but no founder strongly objecting)
- A version bump and date below

| Version | Date | Change |
|---------|------|--------|
| v0.1 | 2026-05-05 | Initial plan post-pivot to cap table direction |
