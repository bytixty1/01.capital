# Competitive Teardown Framework

> A structured worksheet for evaluating existing cap table tools as a Saudi customer would. Not a marketing exercise — a forensic one. The goal is to find specific, citable failures of incumbents at being Saudi-native, not vague "they're not as good as us" hand-waving.

---

## Scope

Three competitors to teardown in this round:

1. **EquityList** — primary direct competitor (MENA presence, serves Tabby)
2. **Carta** — global incumbent with stated MENA expansion
3. **Qapita** — emerging-markets-focused, Singapore-based

Optional Round 2 (after MVP customer interviews suggest others matter): Eqvista, Pulley, Cake Equity, Capboard, Xumane.

---

## Methodology

**Time budget:** 90–120 minutes per competitor. One person, focused session, no multitasking.

**Setup:**
- Sign up for the free / trial tier where one exists
- Create a fake Saudi company profile (you are pretending to be a Saudi LLC founder)
- Try to set up your real 01 Capital cap table (4 founders, equal-ish splits, simple ESOP intent)
- Document everything

**What you're looking for:**
- Where does the product **break** on Saudi-specific cases?
- Where does it **force you** into US/foreign defaults?
- Where does it **not understand** the question you're asking?
- Where is it **better than expected**?

**What you're NOT looking for:**
- "Their UI is uglier than mine"
- "I don't like their pricing page"
- "I would have built X differently"

These are aesthetic preferences, not competitive insights. Discard them.

---

## The teardown worksheet

**Copy this template into a new file per competitor:**
- `docs/discovery/teardowns/equitylist.md`
- `docs/discovery/teardowns/carta.md`
- `docs/discovery/teardowns/qapita.md`

Fill in honestly — including where they beat us. The teardown is worthless if it's a hit-piece.

---

### Competitor: __________________

**Date of teardown:** __________________
**Conducted by:** __________________
**Time spent:** __________________
**Tier evaluated:** Free / Trial / Demo'd / Paid

---

#### Section 1 — Setup experience

| Question | Finding |
|---------|---------|
| How long from signup to first usable cap table view? | |
| Could you complete onboarding without entering US-specific data (state, EIN, etc.)? | |
| Did the entity-type picker include Saudi entity types (LLC, SJSC, JSC)? | |
| Was there an Arabic UI option? | |
| Was SAR a first-class currency or buried? | |
| Could you set the company's domicile to Saudi Arabia clearly? | |

**Verdict for setup (1-5, where 1=blocked, 5=seamless):** ___

**Top 3 friction points:**
1.
2.
3.

---

#### Section 2 — Entity model fit

| Question | Finding |
|---------|---------|
| Does the product distinguish "shares" (JSC/SJSC) from "partner interests" (LLC)? | |
| Can you model a Simplified Joint Stock Company with no minimum capital? | |
| Can you model "profit allocation differs from capital ownership" (Saudi-specific)? | |
| Are right-of-first-refusal (ROFR) periods configurable per AoA? | |
| Are drag-along / tag-along rights modeled per AoA flags, or assumed? | |
| Can you mark a stakeholder as Saudi / GCC / foreign nationality (relevant for zakat allocation)? | |

**Verdict for entity model (1-5):** ___

**The single biggest gap for a Saudi customer:**

---

#### Section 3 — Equity instruments

| Question | Finding |
|---------|---------|
| Common + preferred share classes supported? | |
| Convertible notes? SAFEs? | |
| Sukuk-based convertible instruments (Sharia-compliant)? | |
| Phantom shares as cash-settled? | |
| "Cliff + monthly graded" vesting natively? | |
| Custom vesting schedules with multi-cliff or milestone-based logic? | |
| Exit acceleration (single-trigger, double-trigger)? | |

**Verdict for instruments (1-5):** ___

**Notable instrument-related limitations:**

---

#### Section 4 — Saudi legal compliance

| Question | Finding |
|---------|---------|
| Does the product reference the Saudi Companies Law in any way? | |
| Templates for AoA amendments per Saudi law? | |
| Templates for EGA resolutions in Arabic? | |
| ZATCA-relevant data exports? | |
| Does it model the 50%-of-capital loss threshold (Article 182)? | |
| Does it flag MoC filing requirements when cap table changes? | |

**Verdict for compliance (1-5):** ___

**The compliance feature most needed but missing:**

---

#### Section 5 — Pricing for Saudi customers

| Question | Finding |
|---------|---------|
| Entry-tier price in USD or SAR? | |
| Free tier? What does it include / exclude? | |
| Per-stakeholder, flat, or tiered pricing? | |
| Hidden fees (valuations, document generation, support)? | |
| How does pricing compare to "lawyer time + spreadsheet" alternative? | |
| Would a typical Saudi early-stage startup find this affordable? | |

**Verdict for pricing fit (1-5):** ___

**Price-related deal-breakers for Saudi customers:**

---

#### Section 6 — Documentation, support, and trust signals

| Question | Finding |
|---------|---------|
| Saudi customer logos or case studies? | |
| Arabic support channel? | |
| Saudi-law-aware legal docs (DPA, ToS)? | |
| Server location (relevant for Saudi data residency)? | |
| SOC 2 / ISO 27001 / NCA-CCC certifications? | |

**Verdict for trust (1-5):** ___

**The biggest trust gap for a Saudi enterprise customer:**

---

#### Section 7 — What they do well (be honest)

List 3–5 things this competitor does better than you would, or better than expected:

1.
2.
3.
4.
5.

---

#### Section 8 — What this teardown means for our product

**Specific feature gaps we should fill in MVP:**
1.
2.
3.

**Specific gaps we should NOT try to fill in MVP** (because they're solved well by competitors and would be wasted effort to clone):
1.
2.

**The single most powerful "unfair advantage" claim we can make against this competitor:**

---

## Synthesis after all three teardowns

After completing all three, write a synthesis page in `docs/discovery/competitive-synthesis.md` answering:

1. **Where do all three fail?** Those are universal Saudi-native gaps — our strongest positioning territory.
2. **Where does only one fail?** Those are competitor-specific weaknesses, useful for displacement sales but not for category positioning.
3. **Where do all three excel that we shouldn't try to match in MVP?** Time-saver — don't waste effort cloning their best features.
4. **What's our defensible wedge?** State it in one sentence. If you can't, the wedge isn't sharp enough yet.
5. **Is there a competitor we should *partner* with rather than fight?** (Sometimes integration > competition. Worth asking.)

---

## Anti-patterns to avoid in the teardown

1. **Filling out the worksheet without actually using the product.** Reading their marketing site is not a teardown.
2. **Comparing their full product to our zero product.** They've shipped, you haven't. Of course they have more features. The question is which features matter for Saudi customers.
3. **Letting price-shock cloud judgment.** Carta is expensive. So what? Your customer is probably willing to pay a fair price for the right Saudi product.
4. **Not asking "would I switch?"** If you were a real Saudi founder using their product, would you switch to ours based on what we're proposing? If the answer is "I don't know," the wedge isn't strong enough.

---

## Time-saving tip

When signing up to competitor tools, **use a real-looking but throwaway company name** — not "Test123" or "01 Capital." Use something like "Riyadh Capital Holdings" or "Najd Ventures." Some competitors gate features based on whether the company looks real; using a credible name lets you see more of the product.
