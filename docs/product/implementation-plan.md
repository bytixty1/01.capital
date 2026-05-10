# 01 Capital — Implementation Plan v0.2

> **Status:** Active. ADR-0004 accepted 2026-05-06. Sprint 1 underway.
>
> **This document supersedes v0.1.** Updated 2026-05-10 to reflect validated customer use cases, competitive research findings, and elevated scope for document generation, security, and Saudi-specific integrations.

---

## 1. Executive Summary

01 Capital is a cap table and equity management platform built natively around the 2023 Saudi Companies Law. The product gives Saudi founders, CFOs, and corporate counsel a single source of truth for company ownership — designed for LLCs, SJSCs, and JSCs, with first-class support for Saudi-specific instruments (sukuk-convertibles, Sharia-compliant ESOPs), procedures (MoC filings, ZATCA exports), and governance constructs (ROFR, drag/tag rights, family charters).

**Core philosophy:** the cap table is a legal document in software form. Reliability, auditability, and legal correctness beat feature richness. Every decision is filtered through "would a Saudi corporate lawyer endorse this?"

| Area | Direction |
|---|---|
| Primary user (V1) | Saudi startup founder / CFO managing their own company's equity |
| Market scope | Saudi Arabia first; GCC expansion is V2+ |
| Product posture | Compliance-grade B2B SaaS, not a consumer product |
| Build philosophy | Thin vertical slice → sprint-by-sprint expansion. No parallel feature work. |
| AI posture | None in core engine. Optional, narrow, replaceable explanation features only. |
| Data residency | Saudi-hosted (AWS Bahrain) once real customer data is entered |
| Language | Arabic-first documents and customer support; English UI V1; Arabic UI V1.5 |
| Pricing | SAR-denominated, per-company subscription, tiered by stakeholder count. Published, not opaque. |

**Competitive positioning:** No existing platform natively models SJSC share classes, enforces Saudi Companies Law compliance, generates Arabic-language corporate documents, or integrates with MoC digital filing. This gap is the moat. Every sprint should deepen it.

---

## 2. Product Scope

### In scope for V1 (Sprints 1–8)

- Company creation (LLC, SJSC, JSC entity types — not interchangeable in the data model)
- Stakeholder management (founders, employees, investors, legal entities)
- Share and quota issuance (SJSC shares, LLC quotas, JSC shares — modelled distinctly)
- Capital change events: issuance, transfer, repurchase, splits, secondary transactions
- Secondary transactions: shareholder-to-shareholder transfers (not just company-issued events)
- Scenario and dilution modeling (round modeling, ESOP pool expansion, waterfall)
- ESOP plan setup, grants, vesting tracking, exercise, termination handling
- Sukuk-convertible instrument support
- Phantom share support
- PDF document generation (cap table, share certificates, vesting schedules, resolutions) — Arabic + English, watermarked
- MoC filing tracker (surfaces requirements, generates draft filings — does not auto-submit)
- ZATCA-aligned data export (zakat-year structured)
- CMA ESOP compliance workflow (guided plan design, Arabic disclosure documents)
- Employee equity portal (vesting dashboard, equity payslip, exercise requests)
- Investor portal (read-only cap table view, data room access)
- Audit log of every state-changing event and every login/export/access
- Multi-user access with RBAC (admin / viewer / employee)
- MFA (TOTP) for all users
- Field-level encryption for PII (national IDs, IBANs)

### Out of scope for V1

- Direct API submission to MoC, ZATCA, or CMA portals (surfaces and structures; never auto-submits)
- Tax computation or ZATCA zakat calculation
- Legal advice generation
- Multi-jurisdiction support (Saudi Arabia only in V1)
- Public-listed company workflows (when SJSCs convert to listed JSCs — V2)
- Family charter authoring tools (V1 flags charter presence; V2 authors)
- Secondary market / share-sale marketplace
- AI-driven recommendations or valuations
- HRIS integrations (V2, post-MVP)

---

## 3. Architecture

### 3.1 High Level

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Frontend   │────▶│  Backend API │────▶│ PostgreSQL │
│  Next.js 15 │     │  FastAPI     │     │  (RLS)     │
└─────────────┘     └──────┬───────┘     └────────────┘
                            │
                    ┌───────┴────────┐     ┌────────────┐
                    │  Worker queue  │     │  Redis     │
                    │  (Celery)      │     │  (cache)   │
                    └────────────────┘     └────────────┘
                            │
                    ┌───────┴────────┐
                    │  PDF engine    │
                    │  (WeasyPrint)  │
                    └────────────────┘
```

Monorepo. Modular boundaries inside monolith — no microservices until Sprint 8 validates the need.

### 3.2 Critical Architectural Decisions

**A — Event-sourced cap table.** Every state change is an immutable event. Current cap table is a materialized view derived from the event log. Non-negotiable for legal-grade auditability. See ADR-0003.

**B — Multi-tenancy from day one.** One company = one tenant. Row-level security at the Postgres layer. No query without a tenant scope. See ADR-0005.

**C — Arabic-first document templates.** PDF templates are authored in Arabic and rendered bilingual. English is a second column, not a translation layer. Documents are legally formatted for Saudi corporate law.

**D — Saudi-hosted infrastructure.** Production data runs on AWS Bahrain (me-south-1). No exceptions once real customer data is entered. See ADR-0006.

**E — Provider abstraction for regulatory integrations.** MoC/ZATCA/CMA integrations slot into defined adapter interfaces. V1 stubs them; V2 implements them.

### 3.3 Data Model (Key Entities)

- **Company** — entity_type (LLC | SJSC | JSC), AoA flags, capital structure
- **Stakeholder** — person or entity, nationality, role, national_id (encrypted)
- **Holding** — security type (quota | ordinary_share | preferred_share | option | sukuk_convertible | phantom), quantity, vesting_id, restrictions
- **VestingSchedule** — cliff, period, type, custom milestones
- **CapitalEvent** — the immutable event log (issuance, transfer, secondary_transfer, repurchase, split, exercise, grant, revoke)
- **ESOPPlan** — CMA-aligned plan parameters, pool size, AoA resolution reference
- **Document** — generated PDFs with watermark status, language, signing state
- **FilingRecord** — MoC/CMA/ZATCA tracking, deadline, status
- **AuditLog** — every login, export, cap table view, admin action — not just equity events

---

## 4. Sprint Roadmap

**Sprint length:** 2 weeks. **Key principle:** each sprint delivers a working vertical slice a real customer can use, not infrastructure in isolation.

---

### Sprint 0 — Foundation ✅ Complete

**Goal:** developer can `git clone && docker-compose up` and have a working local environment.

- Monorepo structure
- FastAPI with health endpoint, Postgres, Alembic
- Next.js 15 with auth flows (login, register, logout, /me, email verification)
- 01 Capital brand tokens and design system
- Docker Compose for local dev
- GitHub Actions CI (lint + test on every PR)
- Initial ADRs (0001–0006)
- Supabase as managed Postgres (confirmed)

**Gate passed:** ADR-0004 Accepted 2026-05-06.

---

### Sprint 1 — Company, Stakeholders, and Security Baseline

**Goal:** founder logs in, creates their company, adds co-founders, sees the live cap table. MFA and RBAC live before any real equity data is entered.

**Security (must ship before real data):**
- MFA (TOTP via authenticator app) — required, not optional
- RBAC: admin / viewer / employee roles — enforced at API layer, not just UI
- Rate limiting on all auth endpoints (login, register, password reset)
- Field-level encryption for national ID and IBAN fields (AES-256)
- Audit log: every login, failed login, role change, session start

**Company and cap table:**
- Company creation flow — entity type picker: LLC / SJSC / JSC (with plain-language explanation of each)
- AoA flag capture: drag/tag rights, ROFR period, profit allocation method, family charter flag
- Stakeholder add / edit / remove (founder, co-founder, legal entity)
- Founder quota or share issuance (LLC quotas vs. SJSC ordinary shares — different UI and validation)
- Cap table view: table format, ownership percentages, share counts
- Audit log of all equity events

**Deliverable:** 01 Capital can model its own cap table. MFA active. RBAC enforced.

**Gate:** at least one real Saudi company has entered their data and confirmed the model is correct.

---

### Sprint 2 — Capital Changes, Scenario Modeling, Secondary Transactions

**Goal:** founders can model a fundraising round and record secondary transactions. Dilution is always calculated automatically for every event.

**Capital changes:**
- Share / quota transfer (with ROFR enforcement for LLCs per Saudi Companies Law)
- Capital increase events (new share issuance to investor)
- Capital decrease events (repurchase)
- Share splits and consolidations

**Secondary transactions (competitor gap — no platform supports this cleanly):**
- Shareholder-to-shareholder transfer: investor buys directly from one founder
- Only the selling party's stake decreases — others unaffected
- Automatic per-shareholder dilution recalculation for every event type
- Full audit trail: who sold to whom, at what price, on what date

**Scenario and dilution modeling (from Pulley/Carta/Qapita best practices):**
- Round modeling: input a term sheet → see post-money cap table instantly
- ESOP pool expansion modeling: show dilution before and after pool creation
- Waterfall analysis: liquidation preference stacks, pro-rata distributions
- Fully diluted cap table vs. issued-and-outstanding toggle (always visible)
- Save and name scenarios (draft; not committed to the event log)

**Deliverable:** founders can simulate a Series A and understand exactly what every scenario does to their stake and their co-founders' stakes.

---

### Sprint 3 — ESOP Foundation + PDF Generation + Bilingual Documents

**Goal:** ESOP grants are live and trackable. Cap table and ESOP documents export as legally-formatted bilingual PDFs. This is core product value — not a later add-on.

**ESOP (CMA-aligned from day one):**
- ESOP plan creation wizard: AoA check, pool size, CMA-required plan parameters
- Grant management: issue, modify, revoke
- Vesting engine: cliff + monthly graded (default four-year / one-year cliff per CMA common practice); custom schedule support
- Exercise tracking: cash exercise, net exercise
- Termination handling: good leaver / bad leaver rules
- CMA quarterly disclosure pack export (structured data, Arabic-language)

**PDF document generation (Arabic-first — biggest competitor gap):**
- Cap table PDF: current state + fully diluted, SAR-denominated, bilingual (AR + EN side by side)
- Share certificate / quota certificate: Saudi-law formatted, party details, issuance date, restrictions
- Vesting schedule report: per-employee, all grants, cliff and monthly breakdown
- ESOP grant offer letter: Arabic-primary, CMA-compliant language
- All generated documents carry: "مسودة — يُرجى المراجعة مع مستشار قانوني / DRAFT — REVIEW WITH LEGAL COUNSEL" watermark until a lawyer clears it
- PDF engine: WeasyPrint (Python-native, supports Arabic RTL rendering)
- Field-level PII encryption live before any ESOP grant data is entered

**Deliverable:** 01 Capital can issue ESOP grants and export a bilingual PDF cap table that a Saudi lawyer would recognize as correctly formatted.

---

### Sprint 4 — MoC Filing Tracker + CMA ESOP Compliance + ZATCA Export

**Goal:** the platform proactively surfaces compliance obligations and generates the draft documents needed to fulfill them. Founders see what they need to file and when — they are never surprised.

**MoC filing tracker (Vestd's Companies House model, adapted for Saudi MoC):**
- Event-triggered filing detection: every capital change event maps to one or more MoC filing requirements
- Filing checklist per event type: what document, what deadline, what fee, which MoC portal section
- Draft document generation for each required filing: AoA amendment, partner register update, capital change resolution — Arabic-primary, watermarked
- Filing status tracking: pending / in-progress / filed / overdue
- Deadline reminders (email notifications)
- Does not auto-submit — surfaces and structures only

**CMA ESOP compliance workflow:**
- Guided ESOP plan design that outputs a CMA-compliant plan document
- Arabic-language ESOP plan document generation (CMA submission format)
- 6–8 week approval timeline tracking with milestone reminders
- Article 29 safe harbor checklist (documented, not legal advice)
- CMA quarterly disclosure reports (structured Arabic export)

**ZATCA-aligned export:**
- Zakat-year structured equity data export
- Ownership changes per fiscal year
- Formatted for ZATCA review — not a submission, a structured data file

**Deliverable:** a Saudi founder filing their first ESOP plan gets a guided workflow that produces every Arabic document they need for MoC and CMA — without starting from a blank Word document.

---

### Sprint 5 — Sophisticated Instruments + Waterfall Modeling

**Goal:** the platform handles real fundraising-stage cap tables, not just simple founder splits.

- Sukuk-convertible instrument modeling (conversion triggers, conversion price, Sharia compliance flag)
- Convertible notes and SAFEs (modeled correctly for Saudi law — not Delaware SAFE templates)
- Phantom share / shadow equity support
- Anti-dilution protections (broad-based weighted average; full ratchet — SJSC-applicable)
- Liquidation preferences for SJSC preferred shares (1x non-participating; participating; capped)
- Multi-class share support (ordinary + preferred + founder preferred — SJSC)
- Advanced waterfall modeling: input an exit value, see the exact distribution to every stakeholder class
- Pro-rata rights tracking and exercise workflow

**Deliverable:** a Saudi startup that has raised a seed round with a sukuk-convertible note and is preparing a Series A can model the full cap table correctly, including conversion scenarios and liquidation waterfall.

---

### Sprint 6 — Employee Portal + Investor Portal + Data Room

**Goal:** the platform serves all three user types — founders (admin), employees (equity holders), and investors (read-only stakeholders). This is when the platform becomes a multi-stakeholder product, not just a founder tool.

**Employee equity portal (from Ledgy/Qapita best practices):**
- Employee self-service login: see their own grants, vesting schedule, cliff date, vested vs. unvested
- Equity payslip: monthly statement of equity value, vested shares, unvested shares (SAR-denominated)
- Exercise request workflow: employee submits exercise request; admin approves; event logged
- Equity education: plain-language explanation of options, vesting, and dilution in Arabic and English
- Mobile-responsive (employees check this on phones)

**Investor portal:**
- Read-only cap table view scoped to their own holding and the aggregate table
- Investment summary: entry price, current ownership %, SAR value at last round
- Document access: their own share certificate, any investor reports shared by admin
- No ability to modify any data — view only

**Data room:**
- Admin can create a data room for a fundraising round
- Upload and version-control documents (AoA, financial statements, ESOP plan, cap table)
- Grant time-limited read-only access to prospective investors
- Track who accessed what and when (audit log)
- Revoke access when round closes

**Deliverable:** a Saudi startup can share a clean, professional data room with a VC, and every employee can log in and see their equity without emailing HR.

---

### Sprint 7 — Arabic UI + Notifications + Reporting Dashboard

**Goal:** Arabic-first UI ships. The platform is fully bilingual at the interface level, not just in documents.

**Arabic UI (RTL layout):**
- Full RTL layout for all pages using CSS logical properties
- Arabic translations of all UI strings (not auto-translated — reviewed by native speaker)
- Number and date formatting in Arabic locale
- Arabic-language error messages and validation hints
- Language toggle persists per user preference

**Notifications:**
- Email notifications: vesting cliff approaching, filing deadline, exercise window opening, grant offer issued
- In-app notification center
- Arabic-language email templates

**Reporting dashboard:**
- Cap table summary: total shares, total SAR value, stakeholder count, ESOP pool remaining
- Ownership breakdown chart (by stakeholder type: founders / investors / ESOP / reserved)
- Vesting timeline: who vests when, next 12 months projected
- ESOP pool status: granted / exercised / forfeited / available
- All reports exportable as PDF (bilingual) or CSV

**Deliverable:** a Saudi CFO can run the full platform in Arabic and export every report they need for a board meeting without switching languages.

---

### Sprint 8 — Security Hardening + External Audit + First Customer

**Goal:** the platform is ready for real customer data. External security audit completed. First paying customer onboarded.

**Security hardening:**
- External penetration test (mandatory before first paying customer)
- SOC 2 Type 1 readiness assessment (path to Type 2 in Year 2)
- Secrets management audit: no credentials in code, all in environment variables
- HTTPS-only in production, HSTS headers
- Session management: absolute timeout (8 hours), idle timeout (30 minutes)
- API rate limiting on all endpoints, not just auth
- Dependency vulnerability scan (automated, part of CI)

**Observability:**
- Structured JSON logging (all requests, all equity events)
- Error tracking (Sentry)
- Uptime monitoring with alerting
- Database freshness monitors on materialized cap table views

**Performance:**
- Cap table query time < 200ms for companies with < 500 stakeholders
- PDF generation < 5 seconds for standard cap table
- Caching layer for read-heavy cap table views

**Saudi-hosted production:**
- Production deployment to AWS Bahrain (me-south-1)
- Customer data never leaves Saudi infrastructure
- Backup policy: daily snapshots, 30-day retention, cross-AZ replication

**First customer onboarding:**
- White-glove setup: import existing cap table data (from Excel or manually)
- Lawyer review of first generated documents (watermark removal process defined)
- Customer feedback loop: weekly check-in for first 4 weeks

**Deliverable:** real Saudi company pays real SAR. Data is in Saudi infrastructure. Security audit passed. Zero data integrity incidents.

---

## 5. Feature Comparison vs. Competitors

| Feature | Carta | Pulley | Ledgy | EquityList | Qapita | **01 Capital V1** |
|---|---|---|---|---|---|---|
| LLC / quota support | Partial | No | No | Partial | No | **Yes — native** |
| SJSC share classes | No | No | No | No | No | **Yes — native** |
| JSC support | No | No | No | No | No | **Yes — native** |
| Arabic UI | No | No | No | No | No | **Sprint 7** |
| Arabic documents | No | No | No | No | No | **Sprint 3** |
| SAR-native | No | No | No | Partial | No | **Yes** |
| Saudi Companies Law | No | No | No | No | No | **Yes** |
| MoC filing tracker | No | No | No | No | No | **Sprint 4** |
| CMA ESOP workflow | No | No | No | No | No | **Sprint 4** |
| Secondary transactions | Partial | No | Yes | Partial | Yes | **Sprint 2** |
| Scenario modeling | Yes | Yes | Yes | No | Yes | **Sprint 2** |
| Waterfall analysis | Yes | No | Partial | No | Yes | **Sprint 5** |
| Employee portal | Yes | Partial | Yes | Yes | Yes | **Sprint 6** |
| Investor portal | Yes | No | Yes | No | Yes | **Sprint 6** |
| Data room | Yes | No | Yes | No | Yes | **Sprint 6** |
| PDF generation | Yes | Partial | Yes | Partial | Yes | **Sprint 3** |
| SOC 2 | Yes | Yes | Yes | Yes | Yes | **Sprint 8** |
| ISO 27001 | Yes | No | Yes | Yes | No | **Year 2** |
| Published SAR pricing | No | No | No | No | No | **Yes — launch** |
| MFA required | Yes | Yes | Yes | Yes | Yes | **Sprint 1** |

---

## 6. Pricing Model (SAR-Denominated, Published)

Transparency is a competitive advantage — every major competitor has opaque pricing as a top complaint.

| Tier | Price | Limits | Target |
|---|---|---|---|
| **Seed** (Free) | SAR 0/year | ≤ 25 stakeholders, ≤ SAR 1M raised | Pre-seed LLCs and SJSCs |
| **Early** | SAR 4,800/year | ≤ 50 stakeholders | Seed-stage startups |
| **Growth** | SAR 12,000/year | ≤ 150 stakeholders, + SAR 80/additional | Series A companies |
| **Scale** | SAR 30,000/year | Unlimited stakeholders | Series B+ companies |
| **Enterprise** | Custom | Multi-company, white-label, API access | VC funds, law firms |

All tiers include: MFA, RBAC, audit log, PDF export, Arabic documents, MoC filing tracker.

---

## 7. Technical Standards

### Python / Backend
- Python 3.12+, FastAPI 0.115+, SQLAlchemy 2.0 async, Pydantic 2, Alembic
- Type hints on all public functions; no `Any` without documented reason
- Async for all I/O
- 80%+ test coverage on domain logic (cap table calculations, vesting engine)
- 50%+ coverage on API routes

### TypeScript / Frontend
- `strict: true` always; no `any`
- Named exports, not default (except Next.js page components)
- Server components by default; client components only when interaction requires it
- RTL layout via CSS logical properties (margin-inline, padding-inline, etc.)

### Database
- PostgreSQL 16+
- Alembic migrations — never auto-generated, always reviewed
- Row-level security for multi-tenancy (every table)
- All timestamps UTC at DB layer; rendered in user timezone client-side
- Immutable events table: no UPDATE, no DELETE, ever

### Security
- Secrets in environment variables only — never in code or logs
- JWT stateless auth (V1); session-based upgrade path
- Rate limiting on all endpoints
- All input validated server-side via Pydantic
- HTTPS only in production, HSTS
- PII fields (national_id, iban) encrypted AES-256 at field level
- Penetration test before first paying customer

### PDF Generation
- WeasyPrint (Python-native, full CSS3 support, Arabic RTL via logical properties)
- Templates in Jinja2 (bilingual AR + EN)
- Watermark: "مسودة — يُرجى المراجعة مع مستشار قانوني / DRAFT — REVIEW WITH LEGAL COUNSEL"
- Generated as background job (Celery) for large cap tables

---

## 8. Success Metrics

### End of Sprint 4 (MVP)
- 01 Capital can run its own cap table in the tool end-to-end
- At least 3 Saudi companies have entered real data and confirmed correctness
- MoC filing tracker surfaces the correct requirements for a share transfer event
- First Arabic PDF cap table generated and reviewed by a Saudi lawyer

### End of Sprint 8 (V1 Launch)
- 5+ Saudi companies actively using the platform
- At least 2 paying customers (others may be design partners on free terms)
- MFA and RBAC live for all users
- External penetration test passed
- Production running on AWS Bahrain
- Zero data integrity incidents
- Zero legal-correctness disputes (no customer reports our output is wrong per Saudi law)

### V2 Success (6 months post-V1)
- 30+ paying customers
- At least 2 Saudi VC funds recommend 01 Capital to portfolio companies
- MoC direct filing integration live for at least one event type
- Arabic UI shipped (Sprint 7 complete)
- 70%+ MRR retention month-over-month

---

## 9. Risk Register

| Risk | Mitigation |
|---|---|
| **Legal incorrectness shipped to a customer** | Saudi lawyer advisor relationship from week 1. Every legally-loaded feature reviewed before customer exposure. Watermark on all generated documents. |
| **Security breach of cap table data** | MFA + RBAC + field encryption before first real customer. External pen test before launch. One breach destroys trust permanently in a legal-compliance tool. |
| **Qapita or EquityList builds Saudi-specific features** | Qapita is US-focused for 2–3 years. Build 100+ Saudi customers, VC fund partnerships, and MoC integration before they turn toward MENA. |
| **Carta expands ADGM presence to Saudi entities** | Carta's ADGM license is for fund admin (UAE-domiciled). Riyadh-registered entities require a separate regulatory engagement. Deep Saudi law compliance and Arabic-first UX is the moat Carta cannot replicate quickly. |
| **Discovery validates pain but not willingness to pay** | Free Seed tier removes the pricing objection for early adopters. Design partner agreements confirm value before broad launch. |
| **Saudi data-residency expectations exceed AWS Bahrain capabilities** | Evaluate STC Cloud and Saudi-licensed bare-metal providers early. ADR required before any data-residency decision changes. |
| **Founder bandwidth: engineering is thin** | Realistic sprint sizing. No parallel feature work. Hire engineer #2 by end of Sprint 5 if customer pull justifies. |
| **AoA reading errors in customer onboarding** | Manual lawyer review of first 10 customers' AoA. Build automation only after the manual process is reliable. |
| **Mission creep from "we should also do X"** | This document is the spec. Anything not in it requires an ADR. |

---

## 10. Update Protocol

This plan changes when:
- A sprint proves the next sprint's assumptions wrong
- A customer signal shifts priority
- A regulatory change affects what is possible
- A material new competitor move changes the landscape

Updates require:
- An ADR explaining the change
- Team agreement (no founder strongly objecting)
- Version bump and date below

| Version | Date | Change |
|---|---|---|
| v0.1 | 2026-05-05 | Initial plan post-pivot to cap table direction |
| v0.2 | 2026-05-10 | Elevated document generation to Sprint 3; added security baseline to Sprint 1; added secondary transactions to Sprint 2; added employee and investor portals (Sprint 6); added data room; added Arabic UI sprint; added CMA ESOP workflow; updated pricing model to SAR-denominated published tiers; added competitive feature comparison; added Qapita and Carta as named risks |
