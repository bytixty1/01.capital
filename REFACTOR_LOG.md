# REFACTOR_LOG — ZeroCaps / 01 Capital full architectural refactor

> Working log for the staged refactor. If a session dies mid-phase, resume from
> **CURRENT POSITION** below. Verification gate for every phase: `tsc --noEmit`
> zero errors + `npm run build` passing + no new lint errors in touched files.

**Phase numbering note:** the original session plan used "Steps 1-10"; the
follow-up directive uses "Phases 1-10". Mapping: Step 1≡Phase 2, Step 2≡Phase 3,
Step 3≡Phase 4, Step 4≡Phase 5, Step 5≡Phase 6, Step 6≡Phase 7, Step 7≡Phase 8,
Step 9≡Phase 10. This log uses the Phase numbering.

## CURRENT POSITION

- **Phases 1-6: COMPLETE and verified** (tsc 0 errors, production build passing).
- **Next: Phase 7 — state architecture.** Inputs: the 8 remaining lint errors
  (all `react-hooks/set-state-in-effect`): 7 form pages initializing date state
  in an effect (fix: useState initializer), plus `app/(app)/layout.tsx`
  company-name fetch-in-effect (fix: proper server/state pattern).
- Commits: c4786ab (phases 2-5), 741cb7a (universe tool), phase 6 commit follows.

---

## Phase 1 — Diagnostic (complete, delivered in-session)

Full SOLID/DRY/YAGNI/KISS review of 174 files, delivered and approved in chat
before this log existed. Key approved architecture decisions:
- RSC-first reads, server actions for mutations (Phase 7 work)
- httpOnly cookie session, Bearer attached server-side (Phase 7/10 work)
- zod at the API boundary — ADR-0008 (Phase 8 work)
- No React Query / Zustand — server-first instead (ADR'd)

## Phase 2 — Dead code & cleanup (complete)

- DELETED `update_password.py` — plaintext credential (`Ali055ali`) in git history.
  **USER ACTION STILL REQUIRED:** rotate that password; purge git history
  (`git filter-repo`) when the team can coordinate a force-push.
- DELETED root + backend scratch scripts: `test_asyncpg.py`, `test_db.py`,
  `test_settings.py` (×2), all `* 2.py` Finder-duplicate clones.
- REMOVED `puppeteer` dep (unused, ~300MB), stale Supabase vars from
  `frontend/.env.example`, unused `next/dynamic` import on the landing page.
- `.gitignore`: added `* 2.py`.
- Docs reconciliation: CLAUDE.md + `.agents/rules/01-project-rules.md` updated
  (Next.js 15→16 via ADR-0007; RBAC roles corrected to admin/editor/viewer).

## Phase 3 — TypeScript hardening (complete)

- Fixed dead eslint config (FlatCompat deadlock in eslint 9) — lint had been
  broken for the project's entire life; surfaced 10 pre-existing lint errors,
  tracked for Phases 6-7.
- `tsconfig.json`: added `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`;
  fixed all 16 resulting errors.
- `lib/api.ts`: 9 literal union types mirroring backend enums (EntityType,
  MemberRole, FilingStatus, FilingType, CapTableEventType, InstrumentType, …);
  removed `any` from MoC lookup; typed all optional params `| undefined`.
- **BUG FIXED (approved):** events page `EVENT_CONFIG` was keyed `'issue'`/
  `'transfer'` but the wire sends `'share_issuance'`/`'share_transfer'` — three
  event types had rendered raw fallback text since launch.

## Phase 4 — Constants & magic values (complete)

- Created `lib/format.ts`: `formatNumber/formatSAR/formatNumberWhole/
  formatSARWhole` (en-SA locale, CLAUDE.md rule 5) — replaced 28 inline
  `toLocaleString`/`SAR ${…}` call sites across 8 pages; deleted 2 local
  `fmtSAR` duplicates (waterfall, round-modeler).
- Typed label maps: `STATUS_COLORS: Record<FilingStatus, string>`,
  `FILING_LABELS: Record<FilingType, string>`, `TYPE_LABELS:
  Record<InstrumentType, string>`, EntityType maps on dashboard.

## Phase 5 — Duplicate logic consolidation (complete)

| Duplicate | Canonical home | Replaced in |
|---|---|---|
| Wordmark SVG (4 copies) | `components/Logo.tsx` — gained `variant: 'full'\|'mark'` + aria-label | `app/page.tsx`, `app/(app)/layout.tsx`, `MarketingLayout.tsx` |
| DonutChart (2 impls) | `components/DonutChart.tsx` — optional `onHover`/`size` covers both | dashboard, company page |
| `thStyle`/`tdStyle` (5 files) | `lib/table-styles.ts` — `thCompact/tdCompact` + `thData/tdData` | waterfall, round-modeler (compact); company, stakeholders ×2 (data) |
| `new Date().toISOString().slice(0,10)` (7 files) | `todayISO()` in `lib/format.ts` | all 7 form/filing pages |
| 66-line marketing page template (×3 + variant) | `components/MarketingFeaturePage.tsx` (cta or notice footer) | cap-table, esop, instruments, compliance pages |
| `api.companies.update` | **deleted** — zero call sites; body type didn't match backend `UpdateCompanyRequest` | `lib/api.ts` |

- While consolidating DonutChart, fixed its inherited render-mutation
  (`offset += pct` inside JSX map) — rewritten as per-slice prefix sums to
  satisfy `react-hooks/immutability`. This closes 2 of the 10 pre-existing
  lint errors.
- Grep-verified: zero surviving duplicates of any consolidated pattern.
- Normalized one drifted header padding (stakeholder detail page 14px → 16px
  shared `thData`). Visual change ~2px; intentional drift-kill.

## Phase 6 — Component & function boundaries (complete)

Splits (verbatim moves, zero behavior change; tsc + build verified):
- `companies/[id]/page.tsx` 531→402: `DeleteCompanyModal` (125 lines) →
  `components/DeleteCompanyModal.tsx`.
- `app/page.tsx` 755→272: the 225-line imperative fx effect (lang toggle,
  cursor lens rAF, clocks, reveals) → `hooks/useLandingEffects.ts`; the
  260-line inline CSS string → `app/landing-styles.ts` (kept as raw CSS, not a
  CSS Module — the fx layer toggles global classes like `body.lp-ar-mode`
  whose descendant selectors module scoping would break).
- Late DRY catch: `syntheticMeta` duplicated across waterfall + round-modeler
  (round-modeler's is a strict superset — `ProjectedSyntheticKind` extends
  `SyntheticKind`) → consolidated into `lib/synthetic-meta.ts`.

Evaluated and intentionally NOT split:
- `companies/new/page.tsx` (585): `Toggle` + `validateCR` are single-use
  (one-use abstraction rule) and the 3 wizard steps share ~20 state fields —
  splitting steps would force prop drilling. Cohesive as-is.
- `waterfall/page.tsx` (536): form + results sections share the simulation
  response; no clean seam.
- `lib/api.ts` (535): per-resource split is Phase 8 scope.

Future work logged: decompose `useLandingEffects` rAF internals into
useCursorLens/useDualClock/useLangToggle when the landing page is next touched.

## BUGS FOUND (not fixed — separate task)

1. **Backend:** `cap_table_events.created_by` is nullable in DB but non-null in
   the response schema → will 500 when a user who created events is deleted.
2. **Screenshots mislabeled** (found by graphify vision pass):
   `companies.png`/`onboarding.png` are 404 pages; `dashboard.png`/`account.png`
   show the login page.
3. Pre-existing lint errors remaining (8 of original 10), headline items:
   `react-hooks/set-state-in-effect` in `app/(app)/layout.tsx` (company-name
   fetch) — to be removed wholesale by the Phase 7 RSC/state migration.

## DECISIONS

1. **3D universe tool lives at `tools/universe/`** (standalone Vite app), not in
   `frontend/` — the product's locked Next.js dependency set must not absorb
   three.js. Reads `graphify-out/*.json` via dev middleware.
2. **`graphify-out/` is generated output** — gitignored rather than committed.
3. **Phases 2-5 land as one consolidated commit** instead of per-phase commits:
   the phases were executed before the per-phase-commit directive arrived, and
   their edits overlap in the same files (`api.ts`, `page.tsx` touched by
   Phases 3, 4 and 5). Disentangling staged hunks after the fact risks broken
   intermediate states. From Phase 6 onward: one commit per phase.
4. `companies.update` removed rather than fixed — YAGNI; reintroduce typed
   against backend `UpdateCompanyRequest` when company editing ships.
5. Lint runs are targeted (changed files) until the full-`src` run is reliable
   again — see ENVIRONMENT below.

## ENVIRONMENT INCIDENT (affects all tooling in this repo)

The repo sits in iCloud-synced `~/Documents` with the disk at 96%. macOS evicts
file contents (`ls -lO` → `compressed,dataless`; reads return 0 bytes), which
corrupted `node_modules` mid-session: eslint failed with rotating ETIMEDOUT /
"Invalid package config" / truncated-JSON errors while `cat` showed valid files.
A fresh `npm ci` fixed reads but triggered a `fileproviderd` upload storm that
starved node tooling of I/O for ~30 min. **If a tool fails weirdly in this repo,
check `ls -lO` for `dataless` before debugging the tool.** Durable fixes (user's
call): free disk space; move the repo out of `~/Documents`; or exclude
node_modules from sync.

## REMAINING PHASES

- **Phase 6 — boundaries (SRP):** split mega-pages (`companies/[id]/page.tsx`
  ~700+ lines: page + modal + donut wiring), move `DeleteCompanyModal` out,
  fix remaining lint errors that are boundary-shaped.
- **Phase 7 — state architecture:** RSC reads, httpOnly cookie session,
  `middleware.ts` route guards, kill effect-fetch patterns (incl. layout
  company-name fetch), derived state → useMemo.
- **Phase 8 — API layer:** zod schemas per ADR-0008, typed error shape,
  retry for network failures, 401 → login redirect.
- **Phase 9 — naming & consistency:** boolean `is/has/can` prefixes, handler
  `handle*` prefixes, JSDoc on non-obvious exports.
- **Phase 10 — security:** CSP headers, Postgres RLS migration, cookie
  migration finalization, route-level auth guards.
