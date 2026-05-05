# ADR-0002 — Initial Technical Stack

**Status:** Accepted  
**Date:** 2026-05-05  
**Author:** Abdulelah (CTO)

---

## Context

01 Capital is a B2B SaaS product that handles legal-grade data (cap tables, share registers, equity events). The stack must be:

- Type-safe end-to-end — ownership calculations cannot have runtime type errors
- Async-native — multiple concurrent DB operations per request (event sourcing pattern)
- Well-suited for PostgreSQL row-level security (multi-tenancy requirement)
- Fast to iterate on during discovery phase without locking in complexity

The team has existing Python and TypeScript experience. No new languages were considered for Sprint 0.

---

## Decision

| Layer | Choice | Version |
|---|---|---|
| Backend framework | FastAPI | 0.115+ |
| Backend runtime | Python | 3.12+ |
| ORM | SQLAlchemy async | 2.0 |
| Schema validation | Pydantic v2 | 2.x |
| Migrations | Alembic | 1.15+ |
| Frontend framework | Next.js (App Router) | 15 |
| Frontend language | TypeScript strict | 5.x |
| Frontend runtime | React | 19 |
| Database | PostgreSQL | 16 |
| Cache | Redis | 7 (wired up in later sprint) |
| Local dev | Docker Compose | — |
| CI | GitHub Actions | — |

---

## Rationale

**FastAPI over Django/Flask:** Native async, Pydantic-first, auto-generated OpenAPI docs. The event-sourced write path benefits from async I/O. Django's ORM is sync-first; Flask has no built-in validation.

**SQLAlchemy 2.0 async over Tortoise/databases:** Mature, well-documented RLS support at the query layer. Alembic integration is first-class.

**Next.js 15 App Router over Vite SPA:** Server components reduce bundle size for read-heavy cap table views. Saudi data-residency is easier when renders can happen server-side.

**PostgreSQL 16:** Row-level security is a hard requirement (ADR-0005 will formalize the multi-tenancy model). PostgreSQL's RLS is production-proven; no other OSS database has equivalent depth.

**Redis deferred:** Not needed in Sprint 0. Wired into Docker Compose now so adding it later requires zero infra change.

---

## Consequences

- All new dependencies require an ADR or a documented exception — the locked stack prevents scope creep
- No new frameworks without team agreement
- The TypeScript `strict: true` and Python type hints are non-negotiable — enforcement is in CI

---

## Alternatives considered

| Alternative | Reason rejected |
|---|---|
| Django + DRF | Sync-first ORM; heavier than needed for this scope |
| Prisma + tRPC | Full-stack TypeScript is appealing but loses Python's data/law ecosystem |
| Supabase | Vendor lock-in; RLS at the app layer would be harder to audit |
| MongoDB | No ACID transactions; event sourcing requires transactional writes |
