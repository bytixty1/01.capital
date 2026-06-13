# 01 Capital — Engineering Standards

> Derived from the implementation plan, CLAUDE.md, and the project rules. These are the non-negotiable quality bars for every line of code in this repo. When in doubt, consult this file before writing or reviewing.

---

## 1. API Design

### Route structure
- All routes are prefixed: `/api/companies/{company_id}/...` for company-scoped resources
- Every company-scoped route must go through `get_company_member` or `require_admin` — no exceptions
- HTTP methods: `GET` reads, `POST` creates, `PATCH` partial updates, `DELETE` removes
- Success codes: `200` for reads, `201` for creates, `204` for deletes

### Error responses
All errors return `{"detail": "..."}` — never raw Python exceptions, never 500s for validation failures.

| Situation | Code |
|---|---|
| Not found | 404 |
| Not a member of this company | 403 |
| Insufficient role | 403 |
| Duplicate unique value | 409 |
| Business rule violation (e.g. LLC quota rule) | 400 |
| Input validation failure | 422 (Pydantic handles this automatically) |

### Request/response schemas
- Every endpoint has a Pydantic request schema and a Pydantic response schema — no raw `dict` returns
- Response schemas use `model_config = {"from_attributes": True}` for ORM mapping
- PII fields (`national_id`, `iban`, `mfa_secret`) are **never** included in response schemas — encrypted at rest, returned as `null` or omitted

---

## 2. Data Model

### Tenant scoping
- Every table with company data has a `company_id: uuid.UUID` column with a non-nullable FK to `companies.id`
- Every query on a company-scoped table includes `.where(Model.company_id == member.company_id)` — never query without tenant scope
- Row-level security is enforced at the Postgres layer for production; app-layer checks are a second line of defence, not the first

### Event sourcing
- Cap table state is never written directly — only via immutable `CapTableEvent` rows
- The `holdings` table is a materialized view derived from events — never UPDATE or DELETE holdings directly
- The `cap_table_events` table has no UPDATE, no DELETE, ever. This is a legal record.

### Encryption
- `national_id`, `iban`, and `mfa_secret` are encrypted with AES-256-GCM via `encrypt_field()` before storage
- `decrypt_field()` is called only at the point of use — never in a list endpoint, never logged
- Plain-text PII never appears in logs, audit events, or error messages

### Entity types
- `LLC`, `SJSC`, `JSC` are distinct in the data model — never substitute one for another
- LLC ownership = quotas. SJSC/JSC ownership = shares. The `share_class` field must reflect this — `"quota"` for LLC, any valid class for SJSC/JSC
- `validate_share_class_for_entity()` in `services/cap_table.py` enforces this at the service layer — call it for every issuance and transfer

### Timestamps
- All timestamps stored as UTC at the DB layer
- Rendered in user timezone client-side — never server-side

### Migrations
- Every schema change goes through an Alembic migration — never `Base.metadata.create_all` in production
- Migration filenames: `NNNN_descriptive_name.py` (sequential, not auto-hash)
- Migrations are reviewed before merge — they are irreversible on live data

---

## 3. Authentication & Authorization

### Token flow
- Login returns a JWT. If MFA is enabled, it returns a partial token (`mfa_verified=False`)
- MFA verify (`/api/auth/mfa/verify`) exchanges the partial token for a full token
- Protected routes require `get_current_user` dependency — this rejects partial tokens on non-MFA endpoints
- `get_company_member` extends auth to company membership — call this for all company-scoped reads
- `require_admin` extends to admin-only operations — call this for mutations that affect company structure

### RBAC
| Role | Can do |
|---|---|
| `admin` | Everything: add/remove stakeholders, issue shares, manage members, export |
| `editor` | Add/edit stakeholders, draft events — cannot manage members or delete company |
| `viewer` | Read-only cap table access — no mutations |

Never perform a write operation under `get_company_member` alone — check the role explicitly or use `require_admin`.

### Rate limiting
- All auth endpoints are rate-limited via slowapi (`RATE_LIMIT_ENABLED=true` in production)
- `RATE_LIMIT_ENABLED=false` is only for local e2e test runs — never deploy with it disabled
- The CI job sets `RATE_LIMIT_ENABLED=false` explicitly for the same reason

---

## 4. Backend Code Style

### Functions
- Type hints on all public functions — return types included
- Async for all I/O — no sync DB calls inside async route handlers
- No `Any` type without a `# noqa: ANN401` comment and a written explanation of why

### Error handling
- Raise `HTTPException` for business rule violations — never let SQLAlchemy exceptions bubble to the client
- Catch `IntegrityError` at the point of DB flush/commit for uniqueness violations and convert to 409

### Services vs. routes
- Business logic lives in `services/` — routes are thin: validate input, call service, return response
- The cap table calculation logic, vesting engine, waterfall, and IFRS 2 service never import FastAPI — they are pure Python callable from tests without starting the server

### Testing
- Every new service function gets a pytest test
- Cap table calculation and vesting engine: 80%+ coverage minimum
- API routes: 50%+ coverage minimum
- Tests use `db_client` fixture (isolated test DB with per-test TRUNCATE) — never `client` for DB tests
- `TEST_DATABASE_URL` must always point at a dedicated throwaway DB — the conftest guard enforces this

---

## 5. Frontend Code Style

### Components
- Server components by default — only add `"use client"` when the component requires browser interaction (event handlers, hooks, browser APIs)
- Named exports everywhere except Next.js page components (`export default function Page()`)
- No `any` type — use `unknown` and narrow, or define a proper interface

### Data fetching
- All API calls go through `src/lib/api.ts` — never `fetch()` directly in a component
- The `/api/backend/[...path]` proxy route attaches the session cookie server-side — never send raw JWTs from the client
- Loading and error states are always handled — never leave a component that can be in a loading state without showing feedback

### Forms
- All form inputs are validated client-side with the schemas in `src/lib/schemas.ts` before submission
- Server-side validation errors (422, 400, 409) are surfaced to the user as inline messages — never swallowed silently
- CR number validation: 10 digits, first digit 1–9 (Saudi region code) — `validateCR()` in `companies/new/page.tsx`

### Share classes
- LLC companies: share class is locked to `"quota"` — `isShareClassLocked()` in `src/lib/share-class.ts`
- SJSC/JSC: share class is editable — default to `"ordinary"`
- Never render a share class input as editable for an LLC

### Routing
- Company ID in URLs is always a UUID — regex capture: `/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/`
- Never use `[\w-]+` to capture an ID — it matches the literal string `"new"` and causes silent bugs

---

## 6. Saudi Law Compliance

### Entity-type-specific rules
| Rule | LLC | SJSC | JSC |
|---|---|---|---|
| Ownership instrument | Quota | Ordinary/preferred share | Share |
| Share class in cap table | `"quota"` only | Any valid class | Any valid class |
| ROFR on transfer | Yes — per AoA, typically 30 days | Per AoA | Per AoA |
| Minimum partners/shareholders | 2 natural persons or entities | 1 | 5 |

### Cap table events
- Every issuance, transfer, repurchase, or capital change is a `CapTableEvent` — never a direct update to `holdings`
- LLC quota transfers must check ROFR flag on the company — surface a warning if `has_rofr=True`
- Secondary transfers (shareholder-to-shareholder) reduce only the seller's stake — never recalculate others

### Documents
- All generated documents carry: `"مسودة — يُرجى المراجعة مع مستشار قانوني / DRAFT — REVIEW WITH LEGAL COUNSEL"` until a lawyer clears the watermark
- Never auto-submit to MoC, ZATCA, or CMA — surface and structure only
- Arabic is the primary language for all legal documents; English is the second column

---

## 7. E2E Testing

### Setup (must follow — any deviation causes flakes)
- Run against a **production build**: `npm run build && npx next start -p 3000` — never `npm run dev`
- Backend: `RATE_LIMIT_ENABLED=false uvicorn app.main:app --port 8000` (venv at `~/venvs/zerocaps-backend`)
- DB is persistent Supabase — never hardcode unique values (CR numbers, emails)
- CR numbers: use `uniqueCrNumber()` from `frontend/e2e/helpers/company.ts` — first digit must be 1–9
- Email verification: use `verifyEmailViaDevAPI()` — the magic OTP `"000000"` no longer works
- Company IDs in URL captures: UUID-only regex — `[\w-]+` matches `"new"` and silently returns it as an ID

### When to update
- Run `/graphify --update` after adding new pages or routes
- Run the full e2e suite locally before any PR that touches auth, company creation, or cap table flows

---

## 8. CI

Both jobs must be green before merging to `main`:

| Job | What it checks |
|---|---|
| `Backend — test & coverage` | pytest 75/75 (as of da61899), coverage report |
| `Frontend — type-check & build` | `tsc --noEmit` + `next build` |

The backend job requires:
- `TEST_DATABASE_URL` pointing at the CI Postgres service container
- `RATE_LIMIT_ENABLED=false` (the suite registers ~40 users from one IP)

Never merge with a red CI job. Never add `--no-verify` to skip hooks.

---

## 9. What Is In Scope Right Now (Sprint 1)

Sprint 1 gate: **a Saudi founder can log in, create their company, add co-founders, and see the live cap table.**

**Remaining Sprint 1 work** (anything not listed below is out of scope until Sprint 1 is gated):
- [ ] IBAN field on stakeholder model + AES-GCM encryption (model has `national_id` encrypted; `iban` is not yet modelled)
- [ ] `family_charter` flag on Company model + AoA capture in company creation wizard
- [ ] `custom_fields` JSONB on Stakeholder and Holding (per data model spec in implementation plan §3.3)
- [ ] MFA enforcement gate: block cap table access for users who haven't enabled MFA
- [ ] Stakeholder edit page (currently only create and delete exist)
- [ ] Sprint 1 gate test: 01 Capital models its own cap table end-to-end

**Already complete in Sprint 1:**
- Auth (register, verify, login, logout, /me, password reset)
- MFA (TOTP setup, enable, disable, verify — full flow)
- RBAC (admin/editor/viewer enforced at API layer)
- Rate limiting on all auth endpoints
- Field-level encryption for `national_id` and `mfa_secret` (AES-256-GCM)
- Audit log (login, failed login, MFA events, role changes)
- Company creation (LLC/SJSC/JSC, AoA flags: drag/tag/ROFR)
- Stakeholder create/delete
- Founder quota/share issuance
- Cap table view (holdings, ownership %)
- Cap table events log
- Share transfer, capital increase/decrease

**Sprint 2+ work that already has scaffolding** (do not expand until Sprint 1 is gated):
- Waterfall service (`services/waterfall.py`) — exists, not fully wired to UI
- IFRS 2 service (`services/ifrs2.py`) — exists, not exposed
- Round modeler frontend page — exists at `/companies/[id]/cap-table/round-modeler`
- Instruments (`api/instruments.py`, ESOP) — partially built, Sprint 3 scope

---

## 10. Definition of Done

A feature is done when:
1. Backend route has a Pydantic request schema, a Pydantic response schema, and calls a service
2. Service function has a unit test
3. API route has an integration test using `db_client`
4. Frontend page/form validates input client-side and surfaces server errors inline
5. CI is green (both jobs)
6. No `any` types, no untyped functions, no raw `dict` returns from routes
7. PII is not logged anywhere in the new code path
8. If it touches cap table state: an immutable `CapTableEvent` row is created, never a direct holdings UPDATE
