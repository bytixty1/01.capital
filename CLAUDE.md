# Instructions for Claude Code (and other agentic coding tools)

> Read this file completely before doing anything in this repository. Then read the four documents linked at the end before writing or modifying any code. This is non-negotiable — the project rules are specific and ignoring them will produce work that gets reverted.

---

## What this project is

01 Capital is **cap table and equity management software** for Saudi startups, built natively around the 2023 Saudi Companies Law. It is a B2B SaaS product designed for compliance-grade legal correctness, not a consumer or fintech-trading product.

The repository was previously used for a different project (a TASI stock analysis platform) which has been deprecated. Do not reference, restore, or reimplement anything from that direction. The pivot is documented in `docs/decisions/0001-pivot-to-cap-table.md`.

---

## Current phase

**Build — Sprint 1 active.** Discovery sprint concluded. ADR-0004 (Accepted, 2026-05-06) authorises build. The implementation plan in `docs/product/implementation-plan.md` is the active plan.

Do not add features outside the current sprint scope without an ADR. If asked to build something not in the current sprint, flag it and ask for explicit override.

---

## How to start any session

When you begin a session in this repo, do this in order:

1. Read `CLAUDE.md` (this file)
2. Read `CONSULTANT_SPEC.md` — defines how an AI consultant works with this team
3. Read `.agents/rules/01-project-rules.md` — the locked project rules
4. Read `docs/decisions/0001-pivot-to-cap-table.md` — the strategic anchor
5. Read `docs/discovery/14-day-sprint.md` — the active sprint plan
6. Read `graphify-out/GRAPH_REPORT.md` — codebase knowledge graph (1072 nodes, 68 communities); gives instant orientation on what files exist and how they connect. Run `/graphify --update` after significant code changes to keep it fresh.
7. Then read whatever else is relevant to the specific task

Do not skip steps 2-6 even if the user's request seems simple. The constraints there will change how you should approach almost any task.

---

## Hard rules (do not violate)

### 1. Discovery before build
- No new feature code until ADR-0004 ("Discovery validated") exists and is in `Accepted` status
- The only acceptable code during discovery: foundational scaffolding already in place (auth, design tokens, DB connection, health checks)
- If the user asks for feature work during discovery, remind them of this rule and ask for explicit override

### 2. Saudi Companies Law is the substrate
- Every cap table feature must be validated against `docs/law/saudi-companies-law-digest.md`
- When in doubt, cite the article number in your code comments
- Saudi entity types (LLC, SJSC, JSC) are not interchangeable — the data model must distinguish them
- Do not import US/Delaware mental models — they will be wrong for Saudi corporate law

### 3. Cap table is a legal document
- Every state-changing operation must be event-sourced (immutable event log; current state is materialized)
- The audit log is non-negotiable — never UPDATE or DELETE on the events table
- Generated documents (resolutions, share certificates) must include the watermark "DRAFT — REVIEW WITH LEGAL COUNSEL" until reviewed
- Never auto-submit to regulators (MoC, ZATCA, CMA) — surface and structure only

### 4. Multi-tenancy from day one
- One company = one tenant. Users may belong to multiple companies.
- Row-level security at the Postgres layer, not just app-layer checks
- Never write a query that doesn't scope by tenant

### 5. Bilingual readiness
- All customer-facing strings should be designed for Arabic translation later
- Numbers and IDs render in monospace (`var(--font-mono)`)
- Never hardcode currency symbols — use SAR formatting helpers
- Right-to-left layout must work for any view that will eventually be Arabic

### 6. Sensitive data
- Never log national IDs, IBANs, or other PII
- Saudi data residency: production data must run on Saudi-hosted infrastructure (default plan: AWS Bahrain)
- Document retention follows Saudi corporate law — typically 10 years for corporate records

### 7. AI is not the core
- The cap table engine is fully deterministic
- AI features are optional, narrow, and replaceable — never core to ownership calculations or legal logic
- Do not introduce LLM dependencies into critical paths

### 8. ADR every non-trivial decision
- Architecture decisions, dependency additions, schema changes, security choices → write an ADR in `docs/decisions/`
- Use `docs/decisions/TEMPLATE.md`
- ADRs are short (one page), specific, and dated

### 9. Security baseline before real customer data
- MFA (TOTP) required for all users before any real cap table data is entered
- Role-based access control (RBAC): admin / editor / viewer — never mix permissions
- National IDs, IBANs, and other PII must be encrypted at the field level in the DB, not just at rest
- Audit log of every login, export, and document access — not just cap table state changes
- No real customer data in the system until: MFA live, RBAC live, field encryption live
- External penetration test before first paying customer

### 10. Document generation is core, not optional
- PDF export of cap table (current state + fully diluted) is a Sprint 3 deliverable
- All generated documents carry "DRAFT — REVIEW WITH LEGAL COUNSEL" watermark until a lawyer signs off
- Bilingual output (EN + AR) required from the first document template — not a V2 addition
- Documents must be legally formatted for Saudi corporate law, not generic PDFs
- Secondary transactions (investor buying directly from one shareholder) must be supported before document generation ships

---

## Technical stack (locked)

- **Backend:** FastAPI 0.115+, Python 3.12+, SQLAlchemy 2.0 async, Pydantic 2, Alembic
- **Frontend:** Next.js 16, TypeScript strict mode, React 19 (see ADR-0007)
- **Database:** PostgreSQL 16
- **Cache:** Redis (when needed; not on day one)
- **Local dev:** Docker Compose
- **CI:** GitHub Actions

Do not introduce new frameworks, libraries, or services without an ADR. "It would be nicer with X" is not justification.

---

## Code style and standards

### Python
- Type hints on all public functions
- No `Any` unless truly unavoidable, and document why
- Async for all I/O
- Pydantic models for all API contracts
- Tests for domain logic (cap table calculations especially) at 80%+ coverage

### TypeScript
- `strict: true` always
- No `any`
- Named exports, not default (except for Next.js page components)
- Server components by default; client components only when interaction requires it

### General
- Small, focused PRs
- Conventional commit messages (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- Comments explain *why*, not *what*
- No premature abstractions
- No speculative features

---

## Repository structure

```
01 Capital/
├── CLAUDE.md                      # This file
├── CONSULTANT_SPEC.md             # How AI consultants work with the team
├── README.md                      # Repo entry point for humans
├── CHANGELOG.md                   # Version history
├── LICENSE                        # Proprietary
│
├── .agents/rules/                 # AI assistant project rules
├── .github/workflows/             # CI
│
├── docs/
│   ├── glossary.md                # Bilingual cap table terminology
│   ├── brand/                     # Visual identity, voice, design tokens
│   ├── decisions/                 # ADRs (one source of truth for decisions)
│   ├── discovery/                 # 14-day sprint, interview script, teardown
│   ├── law/                       # Saudi Companies Law, CMA ESOP, ZATCA digests
│   └── product/                   # Implementation plan, future product specs
│
├── backend/                       # FastAPI service
│   └── app/
│       ├── main.py                # Entry point
│       └── core/                  # Config, DB, security primitives
│
├── frontend/                      # Next.js 16 app
│   └── src/app/                   # App router pages and layouts
│
├── shared/                        # Shared contracts/types between BE/FE
│
└── infra/                         # Docker, deployment configs
    └── docker-compose.yml         # Local dev stack
```

---

## What lives outside this repo

The team also maintains a **Notion workspace** for non-engineering work: vision, customer discovery interview notes, GTM pipeline, operations, knowledge base. Do not duplicate that work in the repo. The repo is implementation-focused only.

If you need context from the Notion workspace, ask the user to paste the relevant section into the chat — do not assume you can access it.

---

## How to handle ambiguity

When a request is ambiguous, do this:

1. **Check the project rules first** — many ambiguities are resolved by re-reading `.agents/rules/01-project-rules.md`
2. **Check the implementation plan** — `docs/product/implementation-plan.md` defines sprint boundaries and scope
3. **Ask the user one specific clarifying question** — not a list of five. Pick the question that most determines the path forward.
4. **Default to the more conservative interpretation** — if "add feature X" could mean a thin slice or a comprehensive build, do the thin slice and ask before expanding

---

## How to handle disagreement

If the user asks for something that conflicts with the project rules:

1. State the conflict specifically (cite the rule or document)
2. Propose what you'd do instead
3. Wait for the user to confirm: override the rule, or pick the alternative
4. If they override, document the override in an ADR before implementing

Do not silently comply with rule-violating requests. Do not refuse and stop. Surface the conflict, propose a path, defer to the user.

---

## Useful commands

```bash
# Start local dev stack
cd infra && docker compose up

# Backend only
cd backend && uvicorn app.main:app --reload

# Frontend only
cd frontend && npm run dev

# Run backend tests
cd backend && pytest

# Type-check frontend
cd frontend && npm run type-check

# Build frontend
cd frontend && npm run build
```

---

## The five documents to read before writing code

These are linked above but listed here for emphasis. Read them in this order:

1. **`CONSULTANT_SPEC.md`** — how to operate
2. **`.agents/rules/01-project-rules.md`** — what the rules are
3. **`docs/decisions/0001-pivot-to-cap-table.md`** — why the project exists in this form
4. **`docs/discovery/14-day-sprint.md`** — what the team is doing right now
5. **`graphify-out/GRAPH_REPORT.md`** — codebase knowledge graph for instant orientation

If you have not read these five documents in your current session, you do not have enough context to do good work in this repo. Read them first.

---

## When in doubt

When in doubt about anything not covered here:

- For *strategic* questions (should we build X, what's our positioning, who's the customer): defer to the user. These are not your decisions.
- For *legal* questions (is this allowed under Saudi law, do we need lawyer review): defer to the user and flag for legal advisor review. Do not invent legal interpretations.
- For *technical* questions (how should this be architected, which library): propose with clear reasoning, ask the user to confirm, document in an ADR.

This file last updated: 2026-05-10. If significantly out of date, ask the user for a refresh.
