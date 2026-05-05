# ADR-0005 — Multi-Tenancy Model

**Status:** Accepted  
**Date:** 2026-05-05  
**Author:** Abdulelah (CTO)

---

## Context

01 Capital manages cap table data for multiple companies. A single user (e.g., a CFO or lawyer) may belong to several companies simultaneously. This requires strict data isolation between tenants while supporting cross-company user identities.

The key risk: a bug that leaks one company's ownership data to another is a legal event, not just a product bug. The isolation mechanism must be structural, not just a convention in application code.

---

## Decision

**One company = one tenant.** Users are global and may be members of multiple companies.

Row-level security (RLS) is enforced at the **PostgreSQL layer**, not only at the application layer:

1. Every table that holds company-scoped data has a `company_id UUID NOT NULL` column.
2. A Postgres RLS policy restricts all SELECT/INSERT/UPDATE/DELETE to rows where `company_id = current_setting('app.current_company_id')::uuid`.
3. The FastAPI middleware sets `app.current_company_id` via `SET LOCAL` at the start of every authenticated request, derived from the JWT claim.
4. Application-layer checks (`WHERE company_id = ?`) are written anyway — defence in depth.

---

## Rationale

**Why RLS at the Postgres layer?**  
App-layer-only isolation fails if a developer forgets a `WHERE company_id = ?`, if a raw query is added, or if a library bypasses the ORM. Postgres RLS makes the isolation structural — a missing filter cannot leak data; it causes a query to return zero rows instead.

**Why not separate schemas or databases per tenant?**  
- Separate databases: operationally complex (migration per customer), expensive at startup scale.
- Separate schemas: complex migration tooling (Alembic does not natively support multi-schema), schema proliferation with many customers.
- Single schema + RLS: simple to operate, proven at scale (Supabase, PostgREST), aligns with Alembic's single-schema workflow.

**Why allow users to be in multiple companies?**  
Saudi corporate lawyers and CFOs routinely manage several entities. Locking a user to one company would block the very power users who drive referrals and expansion.

---

## Implementation plan (Sprint 1)

1. Add `company_id` column to all domain tables.
2. Create a `set_tenant()` Postgres function that sets `app.current_company_id`.
3. Write a FastAPI middleware (`TenantMiddleware`) that calls `SET LOCAL app.current_company_id = ?` on every DB connection for authenticated requests.
4. Add RLS policies to each domain table in Alembic migrations.
5. Create a `CompanyMember` join table linking `User ↔ Company` with a `role` column.

---

## Consequences

- Every domain query is automatically scoped — developers cannot accidentally leak cross-tenant data.
- The `company_id` column is required on all domain tables from the first migration that introduces them.
- Integration tests must set `app.current_company_id` explicitly or disable RLS on the test connection.
- Adding a new company-scoped table requires: column, RLS policy, index on `company_id` — these three are non-negotiable.

---

## Alternatives considered

| Alternative | Reason rejected |
|---|---|
| App-layer-only filtering | Single missed WHERE clause = data breach |
| Separate database per tenant | Operationally prohibitive at startup scale |
| Separate schema per tenant | Complex Alembic tooling, schema proliferation |
