# Dual-Terminal Multi-Agent Sprint 5 Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the remaining Sprint 5 work — pro-rata rights tracking, phantom share payout, and waterfall tests — using two Claude terminals with parallel agent dispatch to cut wall-clock time in half.

**Architecture:** Terminal A stays on `main` and runs review/QA agents after each Terminal B delivery. Terminal B runs `claude --worktree` (isolated branch `sprint5-remaining`) and dispatches parallel implementation agents. Terminals coordinate through git commits: Terminal B commits → Terminal A pulls and reviews.

**Tech Stack:** FastAPI 0.115+, SQLAlchemy 2.0 async, Pydantic 2, pytest-asyncio, Next.js 15, TypeScript strict, existing patterns in `backend/app/` and `frontend/src/app/(app)/`

---

## What Is Already Done in Sprint 5

Before starting, confirm these exist:
- `backend/app/services/antidilution.py` — anti-dilution engine (broad-based WA + full ratchet) ✅
- `backend/app/services/conversion.py` — convertible instrument conversion ✅
- `backend/app/services/waterfall.py` — waterfall computation engine ✅
- `backend/app/api/instruments.py` — instruments API with antidilution-preview + convert endpoints ✅
- `backend/app/api/companies.py:392` — waterfall endpoint wired ✅
- `backend/tests/test_instruments_conversion.py` — antidilution + conversion tests ✅
- `frontend/src/app/(app)/companies/[id]/cap-table/waterfall/page.tsx` — waterfall UI ✅
- `frontend/src/app/(app)/companies/[id]/instruments/page.tsx` — instruments list UI ✅

## What Is Missing (This Plan's Scope)

- `backend/tests/test_waterfall.py` — no waterfall tests ❌
- `backend/app/services/phantom.py` — no phantom payout calculation ❌
- Pro-rata rights: no model, no service, no API, no frontend ❌

---

## File Structure

```
backend/
  app/
    models/
      pro_rata_right.py          # NEW — ProRataRight ORM model
    schemas/
      pro_rata.py                # NEW — Pydantic schemas for pro-rata API
    services/
      phantom.py                 # NEW — phantom share payout calculator
      pro_rata.py                # NEW — pro-rata rights service (track + exercise)
    api/
      instruments.py             # MODIFY — add phantom payout endpoint
      pro_rata.py                # NEW — pro-rata rights API router
    main.py                      # MODIFY — register pro_rata router
  alembic/versions/
    0006_pro_rata_rights.py      # NEW — migration for pro_rata_rights table
  tests/
    test_waterfall.py            # NEW — waterfall engine tests
    test_phantom.py              # NEW — phantom payout tests
    test_pro_rata.py             # NEW — pro-rata rights CRUD + exercise tests
frontend/
  src/app/(app)/companies/[id]/
    instruments/
      [instrumentId]/
        phantom-payout/
          page.tsx               # NEW — phantom payout calculator UI
    pro-rata/
      page.tsx                   # NEW — pro-rata rights list + exercise UI
```

---

## Terminal Setup

**Terminal A** = your existing terminal, on `main` branch, used for review agents.
**Terminal B** = second terminal, run `claude --worktree` to get an isolated `sprint5-remaining` branch.

```
Terminal A  (main)  ──── review agents, QA agents
    │
    │  reads commits from Terminal B
    ▼
Terminal B  (sprint5-remaining worktree)  ──── implementation agents (parallel)
```

---

## Task 1 — Terminal B: Create Worktree

**Terminal:** B

- [ ] **Step 1: Open Terminal B and launch Claude with worktree isolation**

```bash
cd "/Users/bytixty1/Documents/Github projects/ZeroCaps"
claude --worktree
```

Claude will create a new branch (e.g. `worktree/sprint5-remaining`) and a linked directory under `.worktrees/sprint5-remaining/`. You will be working inside that directory for all subsequent Terminal B tasks.

- [ ] **Step 2: Confirm isolation**

Run in Terminal B:
```bash
git branch --show-current
```
Expected: a branch name like `worktree/sprint5-remaining` (NOT `main`)

- [ ] **Step 3: Confirm baseline tests pass**

```bash
cd backend && python -m pytest tests/ -x -q 2>&1 | tail -5
```
Expected: all tests pass. If any fail, stop and fix before continuing.

---

## Task 2 — Terminal B: Dispatch Parallel Agents (Phantom Payout + Waterfall Tests)

**Terminal:** B  
**Timing:** Dispatch both agents at the same time (one message with two Agent tool calls).

### Agent A: Phantom Share Payout Service

- [ ] **Step 1: Dispatch this agent from Terminal B**

Paste the following as your prompt in Terminal B's Claude:

```
I need you to implement a phantom share payout calculator for the ZeroCaps / 01 Capital cap table platform.

Context: Phantom shares are tracked in `backend/app/models/instrument.py` as `InstrumentType.PHANTOM`. The model stores `quantity` (reference share count) and `terms` JSONB like `{"reference_share_class": "ordinary", "settlement": "cash"}`. There is no payout calculation yet.

Files to CREATE:
- `backend/app/services/phantom.py`
- `backend/tests/test_phantom.py`

Files to MODIFY:
- `backend/app/api/instruments.py` — add a POST `/companies/{company_id}/instruments/{instrument_id}/phantom-payout` endpoint

## What to build

### backend/app/services/phantom.py

```python
from decimal import Decimal
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

class PhantomPayoutInput(BaseModel):
    exit_price_per_share_sar: Decimal  # hypothetical price per reference share
    tax_rate: Decimal = Decimal("0.00")  # optional: withholding rate 0–1

class PhantomPayoutResult(BaseModel):
    instrument_id: uuid.UUID
    stakeholder_id: uuid.UUID
    reference_shares: Decimal
    gross_payout_sar: Decimal       # quantity * exit_price_per_share
    tax_withheld_sar: Decimal       # gross * tax_rate
    net_payout_sar: Decimal         # gross - tax_withheld
    settlement: str                 # "cash" or "shares"

async def compute_phantom_payout(
    db: AsyncSession,
    company_id: uuid.UUID,
    instrument_id: uuid.UUID,
    input: PhantomPayoutInput,
) -> PhantomPayoutResult:
    ...
```

Implementation rules:
- Load the instrument from the DB, verify it belongs to company_id (multi-tenant)
- Verify instrument_type == "phantom" and status == "active"
- gross_payout = quantity * exit_price_per_share_sar
- tax_withheld = gross_payout * tax_rate (round to 2 decimal places)
- net_payout = gross_payout - tax_withheld
- settlement comes from instrument.terms.get("settlement", "cash")
- Raise HTTPException(404) if not found, HTTPException(400) if not a phantom

### backend/app/api/instruments.py additions

Add at the end of the router:
```python
@router.post(
    "/{company_id}/instruments/{instrument_id}/phantom-payout",
    response_model=PhantomPayoutResult,
)
async def phantom_payout_preview(
    company_id: uuid.UUID,
    instrument_id: uuid.UUID,
    body: PhantomPayoutInput,
    db: AsyncSession = Depends(get_db),
    member: CompanyMember = Depends(require_company_member),
) -> PhantomPayoutResult:
    return await compute_phantom_payout(db, member.company_id, instrument_id, body)
```

### backend/tests/test_phantom.py

Write pytest tests using the existing `conftest.py` fixtures (`db_client`, `mfa_headers`, `company_id`, `stakeholder_id`).

Test cases (all required):
1. `test_phantom_payout_cash_no_tax` — quantity=1000, exit_price=100, tax=0 → gross=100000, net=100000
2. `test_phantom_payout_with_tax` — quantity=500, exit_price=50, tax=0.15 → gross=25000, tax_withheld=3750, net=21250
3. `test_phantom_payout_wrong_type` — pass a sukuk_convertible instrument id → expect 400
4. `test_phantom_payout_not_found` — random UUID → expect 404
5. `test_phantom_payout_wrong_company` — instrument from another company → expect 404

To create a phantom instrument in tests, POST to `/api/companies/{company_id}/instruments` with:
```json
{
  "instrument_type": "phantom",
  "name": "CEO Phantom Plan",
  "quantity": "1000",
  "issue_date": "2026-01-01",
  "stakeholder_id": "<stakeholder_id>",
  "terms": {"reference_share_class": "ordinary", "settlement": "cash"}
}
```

Run tests with: `cd backend && python -m pytest tests/test_phantom.py -v`

After all tests pass, commit:
```bash
git add backend/app/services/phantom.py backend/app/api/instruments.py backend/tests/test_phantom.py
git commit -m "feat(sprint5): phantom share payout calculator + API endpoint"
```
```

- [ ] **Step 2: Verify agent completes and tests pass**

Expected terminal output ends with something like:
```
5 passed in X.Xs
```

---

### Agent B: Waterfall Tests

- [ ] **Step 3: Dispatch this agent from Terminal B (same message as Agent A above — parallel)**

```
I need you to write comprehensive tests for the waterfall engine in the ZeroCaps cap table platform.

Context:
- Engine: `backend/app/services/waterfall.py` — `compute_waterfall(db, company_id, req)` 
- API endpoint: `backend/app/api/companies.py:392` — POST `/companies/{company_id}/cap-table/waterfall`
- Request schema: `WaterfallRequest` in `backend/app/schemas/cap_table.py`
- Response schema: `WaterfallResponse` in `backend/app/schemas/cap_table.py`
- Existing fixtures in `backend/tests/conftest.py`: `db_client`, `mfa_headers`, `company_id`, `stakeholder_id`
- Look at `backend/tests/test_instruments_conversion.py` for pattern on how existing Sprint 5 tests are written.

File to CREATE: `backend/tests/test_waterfall.py`

Read `backend/app/schemas/cap_table.py` first to understand `WaterfallRequest` and `WaterfallPreference` fields exactly.

Write these test cases (all required):

1. `test_waterfall_common_only` — company with only common shares (no preferences), exit_value = 1_000_000 SAR → all proceeds go to common pro-rata
2. `test_waterfall_1x_non_participating_preferred` — one preferred class with 1x non-participating preference (original_investment=500_000, multiplier=1), exit_value=600_000 → preferred gets 500_000, common splits 100_000
3. `test_waterfall_1x_participating_preferred` — preferred participates after liquidation preference, exit_value=2_000_000, original_investment=500_000, multiplier=1 → preferred gets pref + participation share
4. `test_waterfall_capped_participating` — preferred with cap_multiplier=3, original_investment=100_000 → capped at 300_000 then converts to common
5. `test_waterfall_breakpoints_present` — any scenario with preferred → response.breakpoints is a non-empty list
6. `test_waterfall_exit_below_total_pref` — exit_value < sum of all liquidation preferences → common gets 0
7. `test_waterfall_via_api` — POST to `/companies/{company_id}/cap-table/waterfall` with valid WaterfallRequest → 200 with correct structure

For each test, first issue shares/events so the cap table has data (use the cap table event endpoints or directly insert holdings if the conftest supports it — check conftest.py first).

Run with: `cd backend && python -m pytest tests/test_waterfall.py -v`

After all tests pass, commit:
```bash
git add backend/tests/test_waterfall.py
git commit -m "test(sprint5): waterfall engine test suite — 7 scenarios"
```
```

- [ ] **Step 4: Verify Agent B completes**

Expected: 7 passed.

---

## Task 3 — Terminal A: Review Agent While Terminal B Is Building

**Terminal:** A  
**Timing:** Dispatch immediately after Terminal B dispatches its two agents. Terminal A reviews the already-merged Sprint 5 code while Terminal B is still implementing.

- [ ] **Step 1: Dispatch this review agent from Terminal A**

```
Please do a code quality review of the Sprint 5 implementation in the ZeroCaps cap table platform.

Files to review:
- backend/app/services/antidilution.py
- backend/app/services/conversion.py
- backend/app/services/waterfall.py
- backend/app/api/instruments.py
- backend/tests/test_instruments_conversion.py

Review checklist:
1. Multi-tenancy: every DB query scoped by company_id? No query touches another tenant's data.
2. Type safety: all public functions have type hints? No `Any` usage?
3. Decimal precision: all monetary values use Python Decimal, not float?
4. Error handling: 404 for not-found, 400 for bad input, 403 for wrong tenant — not 500s?
5. Saudi law compliance: do comments reference Saudi Companies Law articles where relevant (anti-dilution applies to SJSC per Art. 176)?
6. Test coverage: are edge cases covered (e.g. full ratchet when new price > old price)?

Output: numbered list of issues found. For each issue: file path + line number, what's wrong, suggested fix. If nothing wrong, say "LGTM" for that item.

Do NOT make any code changes. Report only.
```

- [ ] **Step 2: Read the review report**

Terminal A's agent returns a report. Note any critical issues (severity: multi-tenancy violations or wrong Decimal usage). Minor issues go into a follow-up commit.

---

## Task 4 — Terminal B: Pro-Rata Rights (Backend + Migration)

**Terminal:** B  
**Timing:** After Task 2 agents complete (phantom payout + waterfall tests committed).

- [ ] **Step 1: Dispatch this agent from Terminal B**

```
I need you to implement pro-rata rights tracking for the ZeroCaps cap table platform.

Pro-rata rights give existing investors the right to participate in future funding rounds to maintain their ownership percentage. We need to track who has these rights, against which instruments, and whether they exercised them in a given round.

Files to CREATE:
- backend/app/models/pro_rata_right.py
- backend/app/schemas/pro_rata.py
- backend/app/services/pro_rata.py
- backend/app/api/pro_rata.py
- backend/alembic/versions/0006_pro_rata_rights.py
- backend/tests/test_pro_rata.py

Files to MODIFY:
- backend/app/main.py — register the pro_rata router

## Model (backend/app/models/pro_rata_right.py)

```python
import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class ProRataStatus(str, Enum):
    ACTIVE = "active"
    EXERCISED = "exercised"
    WAIVED = "waived"
    EXPIRED = "expired"

class ProRataRight(Base):
    __tablename__ = "pro_rata_rights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    stakeholder_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stakeholders.id", ondelete="CASCADE"), nullable=False)
    instrument_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("instruments.id", ondelete="SET NULL"), nullable=True)
    # The round / event this right is associated with (free text — not a FK)
    round_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Maximum SAR amount the investor can deploy to maintain their stake
    max_investment_sar: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    deadline: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=ProRataStatus.ACTIVE)
    # SAR actually exercised (set when status = exercised)
    exercised_amount_sar: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    exercised_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
```

## Migration (backend/alembic/versions/0006_pro_rata_rights.py)

Look at the previous migration `0005_filings_instruments.py` as the pattern.
Create a migration that adds the `pro_rata_rights` table with all columns above.
Down revision is `"0005"`. Revision id is `"0006"`.

## Schemas (backend/app/schemas/pro_rata.py)

```python
from decimal import Decimal
from datetime import date, datetime
import uuid
from pydantic import BaseModel

class ProRataRightCreate(BaseModel):
    stakeholder_id: uuid.UUID
    instrument_id: uuid.UUID | None = None
    round_name: str
    max_investment_sar: Decimal
    deadline: date | None = None
    notes: str | None = None

class ProRataExercise(BaseModel):
    exercised_amount_sar: Decimal

class ProRataRightResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    stakeholder_id: uuid.UUID
    instrument_id: uuid.UUID | None
    round_name: str
    max_investment_sar: Decimal
    deadline: date | None
    status: str
    exercised_amount_sar: Decimal | None
    exercised_at: datetime | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
```

## Service (backend/app/services/pro_rata.py)

Implement these four functions:

```python
async def list_pro_rata_rights(db, company_id) -> list[ProRataRight]: ...
async def create_pro_rata_right(db, company_id, data: ProRataRightCreate) -> ProRataRight: ...
async def exercise_pro_rata_right(db, company_id, right_id, data: ProRataExercise) -> ProRataRight: ...
async def waive_pro_rata_right(db, company_id, right_id) -> ProRataRight: ...
```

Rules:
- All queries scope by company_id (multi-tenancy)
- exercise: set status=EXERCISED, exercised_amount_sar=data.exercised_amount_sar, exercised_at=now(). Raise 400 if already exercised/waived.
- waive: set status=WAIVED. Raise 400 if already exercised/waived.
- exercised_amount_sar must be <= max_investment_sar (raise 400 if over)

## API (backend/app/api/pro_rata.py)

```python
router = APIRouter(prefix="/companies", tags=["pro-rata"])

GET  /{company_id}/pro-rata-rights            → list_pro_rata_rights
POST /{company_id}/pro-rata-rights            → create_pro_rata_right
POST /{company_id}/pro-rata-rights/{id}/exercise → exercise_pro_rata_right
POST /{company_id}/pro-rata-rights/{id}/waive    → waive_pro_rata_right
```

All routes require `require_company_member` dependency (copy pattern from instruments.py).

## main.py modification

Add near the other router includes:
```python
from app.api import pro_rata
app.include_router(pro_rata.router, prefix="/api")
```

## Tests (backend/tests/test_pro_rata.py)

Use fixtures from conftest.py: `db_client`, `mfa_headers`, `company_id`, `stakeholder_id`.

Test cases (all required):
1. `test_create_pro_rata_right` — create a right, verify all fields in response
2. `test_list_pro_rata_rights` — create two rights, list returns both scoped to company
3. `test_exercise_pro_rata_right` — create, exercise with valid amount → status=exercised
4. `test_exercise_over_max` — exercised_amount > max_investment → 400
5. `test_exercise_already_exercised` — exercise twice → 400 on second call
6. `test_waive_pro_rata_right` — create, waive → status=waived
7. `test_waive_already_exercised` — exercise then waive → 400
8. `test_wrong_company_isolation` — right from company A not accessible from company B token → 404

Run with: `cd backend && python -m pytest tests/test_pro_rata.py -v`
Expected: 8 passed.

After all tests pass, commit:
```bash
git add backend/app/models/pro_rata_right.py \
        backend/app/schemas/pro_rata.py \
        backend/app/services/pro_rata.py \
        backend/app/api/pro_rata.py \
        backend/app/main.py \
        backend/alembic/versions/0006_pro_rata_rights.py \
        backend/tests/test_pro_rata.py
git commit -m "feat(sprint5): pro-rata rights tracking — CRUD + exercise + waive"
```
```

- [ ] **Step 2: Run final test suite to confirm nothing is broken**

```bash
cd backend && python -m pytest tests/ -q 2>&1 | tail -10
```
Expected: all tests pass (previous + new).

---

## Task 5 — Terminal B: Pro-Rata Frontend

**Terminal:** B  
**Timing:** After Task 4 backend is committed.

- [ ] **Step 1: Dispatch this agent from Terminal B**

```
I need you to build the pro-rata rights UI for the ZeroCaps cap table platform.

Context:
- This is a Next.js 15 / TypeScript strict project
- Backend API (already built): 
  - GET  /api/companies/{id}/pro-rata-rights
  - POST /api/companies/{id}/pro-rata-rights
  - POST /api/companies/{id}/pro-rata-rights/{rightId}/exercise
  - POST /api/companies/{id}/pro-rata-rights/{rightId}/waive
- Existing page pattern: look at `frontend/src/app/(app)/companies/[id]/filings/page.tsx` for how to structure a similar list+action page
- API proxy: all backend calls go through `/api/backend/` (see `frontend/src/app/api/backend/[...path]/route.ts`)
- Design tokens: use the existing Tailwind classes and design system (look at existing pages for class patterns)
- TypeScript strict mode: no `any`, all props typed

Files to CREATE:
- frontend/src/app/(app)/companies/[id]/pro-rata/page.tsx

The page should:
1. Fetch and display a table of pro-rata rights with columns: Stakeholder, Round, Max Investment (SAR), Deadline, Status, Actions
2. Status badge: "active" = yellow, "exercised" = green, "waived" = gray, "expired" = red
3. "Add Pro-Rata Right" button → inline form (or modal) with fields: Stakeholder (dropdown from existing stakeholders API), Round Name (text), Max Investment SAR (number), Deadline (date, optional)
4. For active rights: "Exercise" button → prompt for amount (SAR), validate ≤ max, POST to exercise endpoint
5. For active rights: "Waive" button → confirm dialog → POST to waive endpoint
6. All SAR amounts formatted as "SAR 1,000.00" using the existing SAR formatter (grep for it in the codebase)
7. Loading and error states handled

Also CREATE a nav link: modify `frontend/src/app/(app)/layout.tsx` to add "Pro-Rata Rights" link in the sidebar under the cap-table section (look at how "Instruments" or "Filings" links are added).

TypeScript interface to use:
```typescript
interface ProRataRight {
  id: string
  company_id: string
  stakeholder_id: string
  instrument_id: string | null
  round_name: string
  max_investment_sar: string
  deadline: string | null
  status: 'active' | 'exercised' | 'waived' | 'expired'
  exercised_amount_sar: string | null
  exercised_at: string | null
  notes: string | null
  created_at: string
}
```

After building, verify TypeScript compiles:
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

Commit:
```bash
git add frontend/src/app/(app)/companies/[id]/pro-rata/page.tsx \
        frontend/src/app/(app)/layout.tsx
git commit -m "feat(sprint5): pro-rata rights UI — list, add, exercise, waive"
```
```

- [ ] **Step 2: Verify TypeScript is clean**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -c "error" || echo "0 errors"
```
Expected: 0 errors.

---

## Task 6 — Terminal A: Security + Full Test Review

**Terminal:** A  
**Timing:** After Terminal B commits pro-rata backend (Task 4). Pull the branch first.

- [ ] **Step 1: Pull Terminal B's commits into Terminal A for review**

In Terminal A:
```bash
git fetch origin
git log origin/worktree/sprint5-remaining --oneline -6
```
Expected: see the phantom, waterfall tests, and pro-rata commits.

- [ ] **Step 2: Dispatch CSO security agent from Terminal A**

```
Security audit of the new Sprint 5 pro-rata rights feature in ZeroCaps.

Files to audit:
- backend/app/models/pro_rata_right.py
- backend/app/services/pro_rata.py
- backend/app/api/pro_rata.py

Security checklist:
1. Multi-tenancy isolation: every query in the service must filter by company_id. Check that no route accepts a company_id from the URL without verifying the authenticated user belongs to that company (should use require_company_member dep).
2. Input validation: are Decimal fields validated for positive values? Can someone pass a negative max_investment_sar?
3. Privilege escalation: can a viewer role create or exercise rights? Should be admin-only (check what require_company_member enforces vs. what it should enforce for write operations).
4. Over-exercise: is the exercised_amount > max_investment check enforced in the service (not just expected from the client)?
5. Concurrent exercise: if two requests exercise simultaneously, could both succeed and double-count? (Note: full fix is a DB-level lock; just flag if missing.)
6. PII: does stakeholder_id get logged anywhere it shouldn't?

Output: numbered findings with severity (Critical / High / Medium / Low) and exact file:line. Do NOT fix — report only.
```

- [ ] **Step 3: Dispatch test-suite agent from Terminal A**

```
Run the full backend test suite for the ZeroCaps project and report results.

Working directory: /Users/bytixty1/Documents/Github projects/ZeroCaps/backend

Command: python -m pytest tests/ -v --tb=short 2>&1

Report:
- Total tests run
- Pass / fail counts
- Any failing tests: full error message
- Any tests that were skipped and why
```

- [ ] **Step 4: Fix any Critical/High security findings**

Based on the CSO agent's report, fix critical issues in Terminal B (or Terminal A if small). Commit any fixes.

---

## Task 7 — Terminal B: Final Commit and PR

**Terminal:** B

- [ ] **Step 1: Run full backend test suite one final time**

```bash
cd backend && python -m pytest tests/ -q
```
Expected: all pass.

- [ ] **Step 2: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Create the PR**

```bash
gh pr create \
  --title "feat(sprint5): pro-rata rights + phantom payout + waterfall tests" \
  --body "$(cat <<'EOF'
## Sprint 5 Completion

### What this adds
- **Pro-rata rights tracking** — investors can track participation rights, exercise (with amount), or waive. Full CRUD + `pro_rata_rights` DB table (migration 0006).
- **Phantom share payout calculator** — compute gross/net payout for a phantom instrument given a hypothetical exit price per share, with optional withholding tax.
- **Waterfall test suite** — 7 scenarios covering common-only, 1x non-participating, participating, capped participating, breakpoint generation, exit-below-pref, and API smoke test.

### Test coverage
- `tests/test_pro_rata.py` — 8 tests
- `tests/test_phantom.py` — 5 tests  
- `tests/test_waterfall.py` — 7 tests

### Saudi law note
Pro-rata rights are contractual (not statutory under Saudi Companies Law for LLCs — they must appear in the shareholder agreement). The model stores them as tracking records only; they are not auto-enforced.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Share the PR URL with Terminal A for final review**

Copy the PR URL from the output above and paste it into Terminal A's chat.

---

## Task 8 — Terminal A: Final Merge Review

**Terminal:** A

- [ ] **Step 1: Dispatch final review agent**

```
Please do a final review of this PR before merging: <PR_URL>

Check:
1. All Sprint 5 scope items in docs/product/implementation-plan.md (Sprint 5 section) are now implemented or explicitly deferred with justification.
2. No `any` in TypeScript, no bare `Any` in Python.
3. Every new DB query scoped by company_id.
4. Commit messages follow conventional commits format (feat:, test:, fix:).
5. Migration file 0006 looks correct — up() creates table, down() drops it.

Give a go/no-go verdict with a specific list of blockers if no-go.
```

- [ ] **Step 2: Merge if go**

```bash
gh pr merge --squash --delete-branch
```

---

## Coordination Protocol

```
TIME →

Terminal B:  [Task 1 setup] [Task 2: phantom+waterfall agents PARALLEL] [Task 4: pro-rata backend] [Task 5: pro-rata frontend] [Task 7: PR]
                                      ↕ commit                                    ↕ commit                      ↕ commit
Terminal A:  [Task 3: review existing code]                            [Task 6: security+tests]              [Task 8: final review + merge]
```

- Terminal A is NEVER idle. While Terminal B implements, Terminal A reviews.
- After each Terminal B commit, Terminal A does a pass on that code.
- If Terminal A finds a blocker, post it in Terminal B's chat immediately.
- Use git commits as the handoff signal — not messages.
