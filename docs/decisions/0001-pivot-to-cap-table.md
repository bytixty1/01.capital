# ADR-0001: Pivot from Stock Intelligence Platform to Cap Table Software

**Status:** Accepted

**Date:** 2026-05-05

**Authors:** Yosef Naytah (CEO), with Claude consulting

---

## Context

01 Capital began the project as a TASI (Tadawul) stock intelligence platform — a Bloomberg-lite analysis terminal targeting Saudi market power users. The implementation plan was well-architected but the strategic foundation was weak.

Three issues forced a re-evaluation:

1. **Customer mismatch.** The intended user was an experienced TASI trader. None of the four founders are experienced traders. We would have been building for a customer whose problems we did not deeply understand.

2. **Founder need mismatch.** 01 Capital the company did not need a stock analysis terminal. It needed a tool to track its own equity, founder shares, and (eventually) ESOPs as it grew. Building a market analysis tool while the company itself struggled to manage shares in spreadsheets was a strategic incoherence.

3. **Competitive landscape.** The TASI analysis space is crowded — Argaam, Mubasher, Tadawul's own products, plus international tools like TradingView. 01 Capital would have entered with no unfair advantage in data, no edge in market expertise, and a customer acquisition path that depended on consumer marketing the team had not done before.

A strategic conversation surfaced three alternative paths:

- **Path A**: Cap table software for Saudi startups (Carta-style, but Saudi-native)
- **Path B**: TASI learning platform for non-experts becoming competent investors
- **Path C**: Cap table software as the company product, TASI as personal hobby

Path A was selected. Paths B and C are archived in `01 Capital_Product_Directions_Archive.docx` for future reference.

---

## Decision

01 Capital will pivot the active product from a stock intelligence platform to **cap table and equity management software for Saudi startups**, built natively around the 2023 Saudi Companies Law.

The product targets an underserved segment: Saudi-domiciled companies whose legal structure (SJSC, LLC under the new law) is not well-modeled by global cap table tools (Carta, EquityList, Qapita). The wedge is Saudi-native legal correctness, not currency support.

---

## Consequences

### Positive

- **Founder-customer alignment.** The team is the first user. 01 Capital dogfoods the product on its own equity.
- **Defensible niche.** Saudi corporate law expertise is hard for global incumbents to replicate quickly.
- **B2B sales motion.** Sales cycles are slower than consumer, but customer LTV is higher and the team's relationship network (Aramco, Deloitte, EY, Roland Berger, Ministry of Transport, Desert Technologies) maps better to enterprise selling.
- **Government distribution path.** Once a working product exists, Monsha'at and MISA accreditation pathways become realistic — potentially leading to recommended-vendor status for the Saudi startup ecosystem.
- **Clear regulatory anchor.** The Companies Law 2023 provides a stable, citable foundation for product decisions. The CMA's Corporate Governance Regulations and ZATCA tax guidance provide further structure.

### Negative

- **Existing code is largely deprecated.** The TASI platform's auth, design system, and architectural patterns are reusable; the rest is not. This is sunk cost — accepting it is part of the pivot.
- **The team must build domain expertise it does not have.** Saudi corporate law, equity instruments, and ESOP mechanics require active learning. A lawyer-advisor relationship is non-negotiable.
- **Direct competition with funded incumbents.** EquityList already serves MENA unicorns (e.g., Tabby). Carta has Middle East presence. The Saudi-native angle differentiates but does not erase competitive pressure.
- **Slower time to revenue.** B2B SaaS typically requires 6–12 months from MVP to first paying customer, with deeper customer development needed before MVP. Total timeline to meaningful revenue: 12–24 months minimum.
- **Pre-build validation required.** No feature code may be written until the discovery sprint validates that the customer pain is real and our wedge is credible. See `docs/discovery/14-day-sprint.md`.

### Neutral but worth noting

- **The 01 Capital brand assets (logo, palette, typography) carry over unchanged.** Visual identity is reusable across both product directions.
- **The repo name `01 Capital` is misleading for a cap table product** but is being kept for now to avoid renaming overhead. The product itself will be renamed properly after discovery.
- **The `01.Stocks` repo is preserved as historical reference**, not deleted. The architectural patterns and code may inform later technical decisions even if the product itself does not.

---

## Implementation

1. Discovery sprint runs first. See `docs/discovery/14-day-sprint.md`.
2. After discovery passes its validation gates, implementation plan v0.1 (`docs/product/implementation-plan.md`) governs the build sequence.
3. All future ADRs supersede or refine this one. This ADR will not be edited; future changes to the direction get their own ADRs that reference this one.

---

## References

- `01 Capital_Product_Directions_Archive.docx` — full archive of paths considered
- `docs/law/saudi-companies-law-digest.md` — legal substrate the product is built around
- `docs/discovery/14-day-sprint.md` — current execution plan
- Saudi Companies Law (Royal Decree M/132, 2022; effective January 19, 2023)
- CMA Corporate Governance Regulations
- CMA Implementing Regulation of the Companies Law for Listed Joint Stock Companies (2024)
