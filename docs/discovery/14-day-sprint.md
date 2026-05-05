# 14-Day Discovery Sprint

> The next two weeks. Concrete days, concrete owners, concrete deliverables. No code on features yet — only foundational scaffolding so the engineers don't sit idle while validation runs.
>
> **Sprint goal:** at the end of 14 days, ZeroOne has a clear, evidence-backed answer to "Should we build this product?" — and if yes, a sharper definition of what V1 actually is.

---

## Sprint principles

1. **Validation before building.** The temptation to write feature code "just to start" is strong. Resist it. The cost of rebuilding the wrong product later is 10x the cost of validating now.
2. **Customer voice over team intuition.** When the founders' instinct disagrees with what 6+ interviewed customers say, customers win.
3. **Concrete deliverables, dated.** "Working on interviews" is not progress. "5 interviews completed, notes synthesized in Notion" is progress.
4. **Daily async standup.** 5-minute Slack/WhatsApp message from each founder: yesterday, today, blocker. Not a meeting.
5. **Friday review.** 30-minute team call. What we learned, what we're changing for next week.

---

## Owners

| Owner | Sprint role |
|-------|------------|
| **Yosef** (CEO) | Lead: customer interviews, founder network outreach, lawyer recruitment |
| **Ali** (CPO) | Lead: interview synthesis, product specification, customer research dashboard |
| **Mohammed** (CDO) | Lead: brand-system finalization, landing page draft, competitor visual teardown |
| **Abdulelah** (CTO) | Lead: technical scaffolding, infrastructure decisions, ADRs |

Each owner has the authority to make tactical decisions in their lane. Strategic decisions (kill/pivot/scope changes) are team decisions.

---

## Day-by-day plan

### Week 1 — Discovery in motion

#### Day 1 (Monday) — Kickoff and outreach

**Team call (60 min):**
- Read this sprint plan together. Disagree now or commit.
- Read the consultant spec. Disagree now or commit.
- Confirm owners.
- Each founder writes 5 names of Saudi founders they personally know who fit the interview criteria. That's 20 names → target 10 interviews.

**Yosef:**
- Send 10 interview-request messages today. Template in `docs/discovery/outreach-templates.md` (build today if not exists).
- Reach out to 3 lawyer candidates for advisor conversations. Targets: a partner at one of Bracewell, BSA, Hammad & Al-Mehdar, Ghazzawi, or Eyad Reda.

**Ali:**
- Set up the Notion `Discovery` workspace (use the import package).
- Build the `Interviews` database structure.
- Read the founder interview script end-to-end. Suggest edits if needed.

**Mohammed:**
- Sign up for free trials at EquityList, Carta (if available in Saudi without a corporate email), Qapita.
- Read the competitive teardown framework.
- Schedule a 90-min block tomorrow for the first teardown.

**Abdulelah:**
- Initialize the repo locally. Verify CI works (when added).
- Read the Saudi Companies Law digest. Flag any technical model questions.
- Write ADR-0002: "Initial technical stack" (FastAPI + Next.js + Postgres). Even if obvious, document it.

**End of day:** All 4 founders have actionable next steps. No founder is blocked on another.

---

#### Day 2 (Tuesday) — First interviews scheduled, first teardown

**Yosef:**
- Follow up on outreach from Day 1. Goal: 5 interviews scheduled by end of day.
- Continue lawyer outreach.

**Ali:**
- Build the `Pain Points` database in Notion.
- Build the `Findings` page template.
- If Yosef has any interviews booked, attend the first one as note-taker.

**Mohammed:**
- Conduct EquityList teardown (90–120 min, focused).
- Write up findings in `docs/discovery/teardowns/equitylist.md` using the template.
- Note: don't synthesize across competitors yet — synthesis happens after all 3.

**Abdulelah:**
- Scaffold the backend: FastAPI app, Postgres connection, Alembic migrations, auth-only routes.
- Scaffold the frontend: Next.js 15 app, Tailwind config, ZeroOne brand tokens, single login page.
- No features. Just enough to prove the stack works end-to-end.

---

#### Day 3 (Wednesday) — Interviews start, second teardown

**Yosef:**
- Conduct first 1–2 interviews. Send notes to Ali within 30 min of each.
- More outreach. Goal: 8 interviews scheduled by end of day.
- Lawyer: ideally book a 30-min call with at least one candidate by end of week.

**Ali:**
- Synthesize first interview into Notion within 24 hours.
- Add raw quotes to the `Pain Points` database.
- Adjust the script if any question is consistently misunderstood.

**Mohammed:**
- Conduct Carta teardown.
- Document in `docs/discovery/teardowns/carta.md`.

**Abdulelah:**
- Continue scaffold. Aim: by end of Day 4, anyone on the team can `git clone && docker-compose up` and have a working dev environment.
- Set up GitHub Actions for basic CI (lint + test on every PR).

---

#### Day 4 (Thursday) — Interviews continue, third teardown

**Yosef:**
- 1–2 more interviews.
- Hold a 15-min call with Ali to align on what we're learning so far.

**Ali:**
- Sync with Yosef. Update the `Findings` page with emerging patterns.
- If patterns are surprising, propose interview-script tweaks for next interviews.

**Mohammed:**
- Conduct Qapita teardown.
- Document in `docs/discovery/teardowns/qapita.md`.
- Begin a draft of the synthesis page (don't finalize yet).

**Abdulelah:**
- Wrap up scaffold. Verify dev environment with one of the other founders trying to spin it up.
- Begin reading customer interview notes — your turn to start absorbing the domain.

---

#### Day 5 (Friday) — First review

**Team call (45 min):**
- What did we learn this week?
- How many interviews completed? Target was 4–5; reality?
- What surprised us?
- What's the early signal on the wedge?
- Any mid-flight script changes?
- What's at risk for next week?

**Each founder writes a 1-paragraph reflection** in the Notion `Sprint Log` — not for show, for memory.

**End of week 1 expected state:**
- 4–6 interviews completed
- 3 competitor teardowns done
- Notion workspace populated with real data
- Repo scaffold runs end-to-end
- Lawyer conversations in motion (at least one booked)

---

### Week 2 — Synthesis and decision

#### Day 6 (Monday) — More interviews

**Yosef:**
- 1–2 more interviews. Aim to hit 8 total by end of day.
- Lawyer call: held or scheduled.

**Ali:**
- Continue synthesis. The `Findings` page should now have 4–6 patterns identified, with quote evidence.

**Mohammed:**
- Write competitive synthesis (`docs/discovery/competitive-synthesis.md`).
- Begin landing page draft — even if we don't ship it, drafting the value prop forces clarity.

**Abdulelah:**
- Read full set of interview notes.
- Begin: data model sketch for the cap table itself, based on the law digest. Just a diagram — no code.

---

#### Day 7 (Tuesday) — Push to 10 interviews

**Yosef:**
- Final interviews. Goal: 10 completed by end of day.
- Lawyer call ideally happened by today.

**Ali:**
- Stress-test the patterns: are they real, or are we cherry-picking? Cross-reference quotes.

**Mohammed:**
- Land page draft v1 in `docs/product/landing-page-draft.md`. Plain language, no design polish yet.

**Abdulelah:**
- Data model v1 in `docs/product/data-model-v1.md`. Reference the law digest sections explicitly.
- ADR-0003: "Cap table as event-sourced log vs current-state snapshot."

---

#### Day 8 (Wednesday) — The synthesis day

**No new interviews. No new teardowns. No new code.**

**Team works together (4 hours, in person if possible):**
- Read every interview note out loud, one at a time.
- Tag pain points. Cluster them. Vote on which are real and which are noise.
- Update the `Findings` page with the consolidated view.
- Answer explicitly:
  1. Is the pain real?
  2. Are people paying for solutions today (lawyer time, software, internal)?
  3. Is the Saudi-native angle resonating, or is it irrelevant to customers?
  4. What's the single sharpest customer quote we'll use as the project's north star?
  5. What did we get wrong going in?

**Each founder writes a 1-page "what I learned this sprint" reflection.** These get archived; they're how we avoid lying to ourselves later.

---

#### Day 9 (Thursday) — Decision day

**Team call (90 min):**

This is the gate. One of three outcomes:

**Outcome A — Validated. Build.**
- Pain is real, customers exist, Saudi-native wedge resonates, willingness to pay confirmed.
- Write ADR-0004: "Discovery validated. Proceed to MVP."
- Implementation plan v0.1 becomes the active plan.

**Outcome B — Partially validated. Sharpen.**
- Pain is real but the wedge is wrong, or pricing model is wrong, or customer segment is wrong.
- Write ADR-0004: "Discovery partially validated. Pivot scope to [new direction]."
- Spend Days 10-14 on a focused 5-day re-validation, not a full rebuild.

**Outcome C — Not validated. Reconsider.**
- The pain isn't real, or it's real but unmonetizable, or the team isn't a fit.
- Write ADR-0004: "Discovery not validated. Recommend pivoting to one of the archived directions or finding a different problem."
- Don't waste Days 10–14 building something the team doesn't believe in.

**The decision is binding. Don't reopen it casually.**

---

#### Day 10 (Friday) — Plan based on outcome

**If Outcome A:**
- Yosef: book 3 of the 10 interviewees as design partners (free, but they'll commit time to give feedback during build)
- Ali: write the V1 product spec in `docs/product/v1-spec.md`
- Mohammed: lock the brand-system tokens, begin design mocks for the 3 most critical screens
- Abdulelah: refine the data model, begin first vertical slice (auth → company creation → first stakeholder added)

**If Outcome B:**
- Re-do customer outreach for the new segment
- 5 more focused interviews in Days 11-13
- Decision day on Day 14

**If Outcome C:**
- Stop. Take the weekend. Reconvene Monday.
- Discuss the archived paths from `ZeroOne_Product_Directions_Archive.docx`.
- Don't make the decision while disappointed; make it while sober.

---

### Days 11–14 (Mon-Thu of Week 3)

These days are conditional on Day 9's outcome.

**If Outcome A:**
- Days 11–14 are first MVP build days. See `docs/product/implementation-plan.md`.

**If Outcome B:**
- Days 11–13: 5 focused interviews on the sharpened scope.
- Day 14: re-decision.

**If Outcome C:**
- Days 11–14: strategic reset. Possibly engage the consultant (Claude) on path-comparison again.

---

## Sprint exit criteria

The sprint **ends successfully** when:

- [ ] 8+ founder interviews completed and synthesized
- [ ] All 3 competitor teardowns documented
- [ ] 1+ lawyer conversation held
- [ ] Findings synthesis written and reviewed by full team
- [ ] Decision recorded in an ADR (Outcome A, B, or C)
- [ ] If Outcome A: V1 spec drafted, design partners committed, implementation plan v0.1 approved
- [ ] Notion workspace has real data in it, not placeholder content
- [ ] Repo has working dev scaffold (no features required, just runs)

The sprint **ends in failure** if:

- < 5 interviews completed (signal: outreach is broken; fix that first)
- < 2 teardowns completed (signal: someone is procrastinating; address it)
- No decision recorded (signal: avoidance; force the decision)

---

## Anti-patterns watch-list

Things that can quietly kill this sprint:

1. **"Let me just code this small thing while we wait for interviews."** No. The discipline is the product. Code only the foundational scaffold defined for Abdulelah.
2. **"This interview was too short / unclear / weird so I won't write it up yet."** Write it up now. Memory degrades fast.
3. **"We don't need a lawyer until we have customers."** Wrong. The legal context shapes the product. Get the conversation started early, even if the engagement is later.
4. **"Let's just talk to 3 customers; that's enough."** It's not. Patterns emerge at 5+. Don't shortcut.
5. **"The interview script feels too formal."** Adapt the wording, but ask the questions. The script exists because this team is new to discovery and needs structure.
6. **"Let me redesign the brand while waiting for X."** Brand polish does not move discovery. Defer to V1 spec phase.
7. **"This is taking too long, let's compress to 7 days."** No. The 14 days is the floor, not the ceiling. Real customer scheduling alone consumes 5–7 of them.

---

## Where this lives

- This document: `docs/discovery/14-day-sprint.md` (here)
- Daily standups: Notion `Sprint Log` (see Notion package)
- Interviews: Notion `Interviews` database
- Findings: Notion `Findings` page
- Teardowns: `docs/discovery/teardowns/*.md` in this repo
- Decision ADR: `docs/decisions/0004-discovery-outcome.md` (to be written Day 9)
