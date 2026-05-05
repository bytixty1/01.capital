# ADR-0003 — Cap Table as Event-Sourced Log

**Status:** Accepted  
**Date:** 2026-05-05  
**Author:** Abdulelah (CTO)

---

## Context

A cap table is a legal document. Every ownership change — issuance, transfer, repurchase, vesting exercise — must be auditable, reconstructible, and immutable once recorded. Saudi corporate law (Companies Law 2023, Articles 77–92 for LLCs; 149–164 for SJSCs) requires companies to maintain an accurate partners/shareholders register and preserve records for a minimum of 10 years.

Two architectural approaches exist:

1. **Current-state model:** Store only the current cap table. Mutations update rows in place.
2. **Event-sourced model:** Store every change as an immutable event. Current state is a materialized view derived from the event log.

---

## Decision

The cap table engine is **event-sourced**. Every state-changing operation produces an immutable event record. The current cap table view is a materialized projection derived by replaying events in chronological order.

The `events` table is **append-only** — no UPDATE or DELETE operations are permitted on it, enforced at the Postgres layer via a trigger (to be implemented in Sprint 1).

---

## Rationale

**Legal auditability:** The Saudi Companies Law requires a reconstructible record of every ownership change. An event log satisfies this natively; a mutable current-state table requires additional audit-log infrastructure that is more complex and easier to bypass.

**Correction without erasure:** Mistakes are corrected by recording a compensating event (e.g., a reversal), not by mutating history. This matches how lawyers and notaries think about corporate records.

**Temporal queries:** "What did the cap table look like on the date of the Series A term sheet signing?" is a first-class query in an event-sourced system. It requires full replay in a current-state system.

**Compliance exports:** ZATCA and MoC require point-in-time snapshots. Event sourcing makes these trivially correct.

---

## Data shape (illustrative — schema finalized in Sprint 1)

```
events
  id            UUID PK
  company_id    UUID FK  -- tenant scope
  event_type    VARCHAR  -- ISSUANCE | TRANSFER | REPURCHASE | GRANT | EXERCISE | ...
  occurred_at   TIMESTAMPTZ
  recorded_by   UUID FK  -- user who recorded the event
  payload       JSONB    -- event-type-specific data
  metadata      JSONB    -- IP, user-agent, correlation ID
```

The current cap table is a view/function that selects and aggregates from `events` where `company_id = current_tenant()`.

---

## Consequences

- All write paths go through the event layer — no direct mutations to derived state
- Read paths query the materialized view (pre-computed for performance) or replay on demand for point-in-time queries
- The `events` table requires a Postgres trigger to enforce immutability (Sprint 1)
- Testing domain logic means testing the projection function, not DB state — cleaner unit tests
- Migrations that change event payload shapes require careful versioning

---

## Alternatives considered

| Alternative | Reason rejected |
|---|---|
| Mutable current-state + audit log | Audit log is optional/bypassable; legal requirements need it to be structural |
| CQRS with separate write/read DBs | Premature for V1; single Postgres instance with views achieves the same separation |
| Blockchain / immutable ledger service | Operationally complex; no legal recognition advantage in Saudi context |
