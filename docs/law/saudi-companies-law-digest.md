# Saudi Companies Law (2023) — Cap Table Digest
# دليل نظام الشركات السعودي (2023) — ملخص لجدول الملكية

> **Status:** Working digest. Operationally useful, not legally definitive. Every product feature derived from this document must be reviewed by a Saudi-qualified corporate lawyer before any contractual or regulatory claim is made. Citations are to the Companies Law promulgated by Royal Decree M/132 dated 1/12/1443H (28 June 2022), in force from 26/6/1444H (19 January 2023).
>
> **الحالة:** ملخص عملي للاستخدام الداخلي وليس مرجعاً قانونياً نهائياً. يجب على محامٍ معتمد في المملكة العربية السعودية مراجعة أي ميزة أو مطالبة قانونية مستندة إلى هذا المستند.

---

## Why this document exists

The cap table product cannot be built generically. It must reflect the specific entity types, instruments, governance rules, and filing requirements defined by the Saudi Companies Law (the "**New Law**" or "**Law**"). This digest extracts the parts of the Law that affect product design, prioritized by impact on the cap table data model and feature surface.

It is not exhaustive. It is operational.

---

## Section A — Entity types relevant to startups
## القسم أ — أشكال الشركات ذات الصلة بالشركات الناشئة

The New Law unified rules for commercial, professional, and non-profit companies under a single framework, replacing a fragmented prior regime ([Bracewell, 2022](https://www.bracewell.com/resources/new-saudi-companies-law-2022-key-changes-and-next-steps-companies-ksa/); [Jarbou Law](https://aljarboulaw.com/new-saudi-commercial-companies-law-important-changes-and-reforms/); [BSA](https://www.bsalaw.com/insight/the-new-companies-law-in-the-kingdom-of-saudi-arabia-what-to-expect/)).

For startup cap table purposes, three entity types matter:

### A.1 Limited Liability Company (LLC) — شركة ذات مسؤولية محدودة

The most common Saudi corporate form, especially for early-stage and family-owned businesses.

**Key characteristics for cap table modeling:**

- **Ownership is by partners, not shareholders.** The internal data model must distinguish "partners" (LLC) from "shareholders" (JSC/SJSC). Both terms exist; they are not interchangeable in legal documents.
- **No share certificates issued.** Ownership is evidenced by the Articles of Association and the partner register maintained by the company. The cap table software effectively *is* the partner register for our LLC customers.
- **Right of first refusal is statutory.** When a partner wishes to sell to a third party, other partners have a 30-day right of first refusal unless the AoA extends this period.
- **Single-shareholder LLCs are now permitted** under the New Law — a significant change. Solo founders no longer need a nominal second partner ([Batic Law Firm](https://baticfirm.com/saudi-companies-law/)).
- **LLCs may now issue debt instruments** including sukuks and financing instruments under Article 179 of the New Law — previously prohibited. This opens the door to Sharia-compliant convertible-note equivalents ([BSA Law](https://www.bsalaw.com/insight/the-new-companies-law-in-the-kingdom-of-saudi-arabia-what-to-expect/)).
- **Family business charters can be embedded** in the Articles of Association (or kept separate but binding), regulating governance, transfers, and succession ([Bracewell, 2022](https://www.bracewell.com/resources/new-saudi-companies-law-2022-key-changes-and-next-steps-companies-ksa/)).
- **Drag-along and tag-along rights** are now formally recognized for LLC partners, where the AoA expressly allows them ([BSA Law](https://www.bsalaw.com/insight/the-new-companies-law-in-the-kingdom-of-saudi-arabia-what-to-expect/)).
- **Liability is limited to capital contribution.** Standard.

**Cap table implications:**
- Data model: `Company.entity_type = 'LLC'` triggers different validation rules than JSC/SJSC.
- Transfer flows must enforce 30-day ROFR or AoA-defined custom periods.
- ESOP mechanics differ for LLCs vs JSCs (see Section C).
- Family charter is a first-class artifact, not an afterthought.

---

### A.2 Joint Stock Company (JSC) — شركة مساهمة

The traditional vehicle for larger businesses and public listing candidates.

**Key characteristics:**

- **Minimum capital:** SAR 500,000 (private JSC); SAR 10 million (public JSC) ([Eyad Reda Law Firm](https://erlf.com/publications/companies-law/)).
- **Minimum shareholders:** 2; no maximum.
- **Board of directors required.**
- **Shares may be common or preferred.** Preferred shares carry economic preferences (dividends, liquidation) without voting rights, per the New Law.
- **Public JSCs** can list on Tadawul and are regulated by the Capital Market Authority (CMA) in addition to the Ministry of Commerce.
- **Drag-along (Article 113)** is formally recognized: shareholders owning 90%+ can require minorities to sell to a third party ([BSA Law](https://www.bsalaw.com/insight/the-new-companies-law-in-the-kingdom-of-saudi-arabia-what-to-expect/)).
- **Tag-along** mirrors this on the minority side.

**Cap table implications:**
- Share class modeling required (common vs preferred, voting vs non-voting).
- 90% threshold for drag-along must be calculable in real-time on the cap table.
- Public JSCs introduce CMA disclosure obligations (see Section D).
- Most Saudi startups will not start as JSCs — but they may convert during growth-stage fundraising.

---

### A.3 Simplified Joint Stock Company (SJSC) — شركة مساهمة مبسطة

**The most important new entity type for our product.**

The SJSC is a new form introduced specifically to support entrepreneurship and venture capital ([Jarbou Law](https://aljarboulaw.com/new-saudi-commercial-companies-law-important-changes-and-reforms/)).

**Key characteristics:**

- **No minimum capital requirement.** This is the major innovation. Founders can incorporate with whatever capital they have.
- **Single shareholder permitted.** Solo founders supported.
- **Maximum flexibility in share classes.** The SJSC structure is designed to accommodate the kinds of preferred share classes, anti-dilution provisions, and liquidation preferences that VC investors expect — closer to a Delaware C-Corp than a traditional Saudi JSC.
- **Streamlined governance.** Board structure and shareholder formalities are simplified relative to the JSC.
- **Cannot be publicly listed** while in SJSC form. Conversion to JSC is required for IPO.

**Why this matters for the product:**

Existing global cap table tools (Carta, EquityList, Qapita) do not have SJSC as a first-class entity type. They model US C-Corps, UK Ltds, Indian PvtLtds, and a generic "international company" bucket. SJSC support, with the right share class flexibility, ESOP integration, and conversion-to-JSC pathway, is **the wedge feature**.

**Cap table implications:**
- Share class flexibility is mandatory: founder common, employee common, preferred series A/B/C with full waterfall preference modeling.
- Convertible instrument support (sukuks, convertible notes equivalents).
- A clear "convert to JSC" workflow for late-stage companies (cap table re-organization, not a re-creation).
- CMA disclosure requirements may apply at conversion or pre-IPO.

---

### A.4 Other entity types — out of scope for MVP

For completeness:
- **General Partnership** (شركة تضامن) — unlimited liability, rare for startups
- **Limited Partnership** (شركة توصية بسيطة) — unusual for tech startups
- **Cooperative Company** — not a startup vehicle
- **Professional Companies** — for licensed professions; out of scope unless we explicitly target law/accounting firms

The MVP supports LLC + SJSC. JSC support comes when our customers grow into it.

---

## Section B — Capital, shares, and contributions
## القسم ب — رأس المال والأسهم والحصص

### B.1 What constitutes capital

Per the New Law, a company's capital may consist of:
- **Cash contributions** (most common)
- **In-kind contributions** (assets, IP, equipment) — must be valued and documented
- **Service contributions** are *not* permitted to form capital; they are treated separately

**Cap table implication:** the data model must support multiple contribution types per shareholder, with documentation links and (for in-kind) valuation records.

### B.2 Profit allocation can differ from ownership

A meaningful Saudi-specific feature: the Articles of Association may prescribe profit allocation that differs from each partner/shareholder's ownership of capital ([Saudi Legal](https://www.saudilegal.com/saudi-law-overview/companies-and-partnerships)).

In other words: a partner with 30% capital ownership might receive 40% of profits if the AoA so provides.

**Cap table implication:** ownership percentage and profit/loss allocation percentage are separate fields, not the same field. Most global tools conflate them.

### B.3 Pledging shares

A shareholder may pledge their shares (use them as security) per CMA implementing regulations and the New Law. The pledge does not transfer ownership but encumbers it.

**Cap table implication:** model `share_pledges` as a first-class entity, with lender, amount, status (active/released), and effect on transferability.

### B.4 Pre-emptive rights

Under the CMA Implementing Regulation of the Companies Law for Listed Joint Stock Companies (2024), pre-emptive rights are tradable securities issued by a company that grant their holder the right to subscribe for new cash shares offered upon the Extraordinary General Assembly's approval of a capital increase.

**Cap table implication:** capital increase events must surface pre-emptive rights at the right moment, calculated correctly, and tradable as a separate instrument during the rights period.

---

## Section C — Employee Share Plans (ESOP)
## القسم ج — برامج أسهم الموظفين

This is the second most-critical area for a startup cap table tool, after the basic share register.

### C.1 Legal foundation

ESOPs are now expressly permitted under the New Law. Article 72(2)(b) makes reference to employee incentive schemes by allowing the issuance of shares to employees.

The CMA's Corporate Governance Regulations provide additional structure: they address employee compensation and benefits by outlining provisions for employee share grant programs, profit-sharing schemes, and retirement programs, alongside the requirement for independently funded budgets for these initiatives. These regulations mandate transparent disclosure regarding employee share ownership plans, including the number of shares to be issued, the specific terms of the plans, and the criteria for employee eligibility.

### C.2 Process for establishing an ESOP

For listed Joint Stock Companies, the CMA Implementing Regulation requires:

1. In addition to the other requirements of a share buy-back, obtain the Extraordinary General Assembly's approval on the Employees' Shares plan. The General Assembly may authorise the Board to determine the terms of the plan including the allocation price for each Share offered to employees if offered for consideration
2. Non-executive Board members shall not participate in the Employees' Shares plan, and executive Board members shall not vote on Board resolutions relating to the plan

For unlisted companies (LLC and SJSC — where most of our customers will live):

- The company's articles of association must explicitly allow for share purchases for employee allocation, and the extraordinary general assembly must approve the program
- ESOPs are generally considered an exempted offer and do not trigger filing requirements. This designation allows employers to issue unlisted, contract-based securities to employees without being subject to the full scope of applicable Capital Market Authority (CMA) regulations
- The CMA does impose specific disclosures: quarterly notifications detailing the total number and value of the exempted offers and reporting on any ongoing ESOP offers

### C.3 Common Saudi ESOP structures

From law-firm commentary on Saudi market practice:

- 67% of grants in Middle East startups follow a four-year vesting schedule with a one-year cliff. The regional norm for structure is 25% of equity vests after the first year and the remaining 75% vests monthly thereafter
- **Cliff vesting:** all granted options become exercisable after a defined period
- **Ratable / graded vesting:** consistent percentage vests at regular intervals
- **Phantom shares:** cash-settled rewards based on share appreciation, used when actual equity issuance is constrained

### C.4 Tax treatment

Saudi Arabia currently has no personal income tax, so employees face no immediate tax liability when receiving, vesting, or exercising ESOP shares. This is a meaningful simplification compared to US/UK ESOP tax complexity.

However, **zakat treatment** for the company is non-trivial. ESOPs affect zakatable assets, and the company must work with financial advisors to ensure proper accounting. ZATCA has issued clarification guides specifically addressing the income tax and zakat treatment of employee equity.

### C.5 Cap table product implications

- **Vesting engine** is core, not optional. Must support cliff + monthly/quarterly graded schedules natively.
- **Pre-vest, post-vest, exercised, expired** states for options.
- **Expiration on termination** workflows (typical: 90 days post-departure to exercise vested options).
- **Buyback clauses** — common in Saudi grants where the company can repurchase shares from departing employees at a defined price.
- **Phantom share support** — for entity types or scenarios where actual equity issuance isn't viable.
- **Exempted-offer reporting** — quarterly CMA notification generation, even if not filed automatically.
- **Zakat-accounting export** — structured data the company's accountant can use for zakat reporting.

---

## Section D — Capital Markets Authority disclosure
## القسم د — إفصاحات هيئة السوق المالية

Most of our MVP customers (LLCs and SJSCs) will not be CMA-listed, so the heaviest CMA disclosure regime does not apply to them. But several disclosures still touch the cap table:

### D.1 For unlisted companies with ESOPs

- **Quarterly exempted-offer notifications** to the CMA: total number and value of grants, status of ongoing ESOP offers (per Section C.2 above).

### D.2 For SJSCs preparing to convert to JSC and list

- **Prospectus requirements** (Article 30 of Rules on the Offer of Securities and Continuing Obligations) require comprehensive disclosure of activities, assets, liabilities, financial position, management, prospects, profits and losses ([Saudi Legal — Capital Markets](https://www.saudilegal.com/saudi-law-overview/capital-markets)).
- **Three-year financial track record** of the same primary activity is generally required before listing.
- **Cap table history audit** — the cleaner the cap table at this point, the smoother the listing. This is a key product value proposition.

### D.3 For listed companies (out of scope for MVP)

CMA Corporate Governance Regulations impose continuous disclosure obligations on listed companies, including:
- Capital changes
- Major shareholder changes (5%+, 10%+, 20%+ thresholds)
- Related-party transactions
- ESOP plan disclosures in annual reports

These become product features only when a customer converts to a listed JSC.

---

## Section E — Family business charters
## القسم هـ — مواثيق الشركات العائلية

The New Law explicitly enables family-owned companies to enter binding family business charters, either embedded in the Articles of Association or maintained separately ([Bracewell, 2022](https://www.bracewell.com/resources/new-saudi-companies-law-2022-key-changes-and-next-steps-companies-ksa/)).

A family charter typically governs:
- Management succession
- Transfer restrictions across generations
- Voting blocs within the family
- Conflict resolution
- Dividend policy specific to family branches

**Why this matters for the product:**

A meaningful slice of Saudi private companies are family-owned. Even tech startups often have family investors who care about charter-style provisions. Supporting family charter modeling, transfer restrictions, and inter-generational rules is a Saudi-specific differentiator.

For MVP: model this lightly (custom transfer rules, family group association on shareholders). For V2: full charter authoring tools.

---

## Section F — Capital changes
## القسم و — تغييرات رأس المال

The Law and its Implementing Regulations provide mechanisms for:

- **Capital increase** via cash contribution, in-kind contribution, or capitalization of reserves/retained earnings (the latter creating bonus shares — see CMA examples of [Al Rajhi Bank](https://cma.gov.sa/en/Pages/default.aspx) and similar).
- **Capital decrease** with regulatory approval and creditor protection requirements.
- **Treasury shares** — companies may hold their own shares under specific conditions; they can be allocated to ESOPs or canceled.

For the cap table:
- Every capital change is an event with a date, reason, regulatory approval reference (where applicable), and impact on the share register.
- The cap table software is the system of record for capital changes; it generates the documentation the company files with the MoC.

---

## Section G — Loss thresholds and going concern
## القسم ز — عتبات الخسائر واستمرارية الشركة

A practical compliance trap: in the case of a limited liability company, Article 182 of the New Companies Law states that in the event of losses reaching half a company's capital, the company's managers must hold a partners' meeting within 60 days to consider the continuation of the company and the relevant procedures that must follow.

**Why this matters:**

For early-stage LLC startups burning cash before revenue, this threshold is hit *constantly*. Many Saudi startup founders are unaware of this requirement. A cap table tool that automatically flags loss-to-capital ratio crossing the 50% threshold and prompts the required partner meeting is genuinely useful — and avoids Articles-of-Association liability for the managers.

**Cap table product feature:** "Going concern alerts" — financial integration (or manual entry) tracks accumulated losses against paid-in capital and surfaces required compliance actions.

---

## Section H — Drag-along, tag-along, and transfer restrictions
## القسم ح — حقوق المرافقة والإلزام بالبيع وقيود نقل الملكية

### H.1 Drag-along (Article 113 for JSCs; mirror provisions for LLCs)

Article 113 of the New Companies Law allows JSC shareholders to include provisions in the company's articles of association that allow shareholders owning 90% of the share capital to require the minority shareholders to sell their ownership to a third party (a 'drag-along' right), or enable minority shareholders to sell their ownership to a third party interested in acquiring the majority shareholder's ownership (a 'tag-along' right). Similar rights have been provided to the partners of a limited liability company under the New Companies Law.

**Critical:** drag/tag rights only exist if the AoA expressly provides for them. They are not statutory by default. If a customer's AoA is silent, these rights do not exist for them.

**Cap table product feature:** AoA-aware drag/tag enforcement. The product knows which rights are enabled for each company based on AoA flags, and enforces them in transfer scenarios.

### H.2 Right of first refusal (LLC default)

For LLCs, ROFR is statutory: unless this period is extended in the articles of association, the right of first refusal must be exercised within thirty days from receiving notification of the agreed price from the manager, or other method of valuation.

**Cap table product feature:** ROFR workflow built into all transfer flows for LLC customers. Notification to other partners, 30-day countdown, response capture, automatic transfer execution if no exercise.

---

## Section I — Director and manager liability
## القسم ط — مسؤولية المديرين وأعضاء مجلس الإدارة

A reminder for the founders themselves, and for any liability-aware product copy:

Founders, partners, managers of a company or members of its board of directors are jointly liable for damages resulting from a failure to register the articles of association or bylaws and any amendments thereto with the Commercial Registry. The manager and members of the board of directors are also jointly liable to compensate the company, partners, shareholders or third parties for damage arising due to violations of the 2022 Companies Regulation, the company's articles of association or bylaws, or by reason of any error, neglect or default on their part in the performance of their work. Actions for liability are time barred five years from the end of the financial year of the company in which the harmful act occurred, or three years from the end of the work of the manager or of the membership of the concerned member of the board of directors, whichever occurs later.

**Why this matters:**

The cap table is a legal record. Errors in it can create joint and several liability for managers. This is *exactly* why Saudi startups need a credible cap table tool — and *exactly* why our product cannot afford data integrity bugs.

It's also a sales narrative: "Spreadsheets create personal liability for the manager. We eliminate that risk."

---

## Section J — Quick reference: what the cap table data model must support
## القسم ي — متطلبات نموذج البيانات لجدول الملكية

Based on Sections A-I, the minimum viable data model:

**Companies**
- entity_type: enum {LLC, SJSC, JSC}
- aoa_provisions: structured flags for {drag_along_enabled, tag_along_enabled, custom_rofr_period, family_charter_present, profit_allocation_differs_from_ownership}
- capital: cash_capital, in_kind_capital, total_capital
- accumulated_losses: tracked over time
- moc_filing_records: linked

**Stakeholders**
- person_or_entity (individual / company / fund)
- nationality (Saudi / GCC / other foreign — affects MISA implications)
- national_id_or_cr_number (encrypted at rest, never displayed in lists)
- role: founder | employee | investor | family_member | service_provider

**Holdings**
- stakeholder_id
- security_type: enum {common_share, preferred_share_seriesA/B/C/..., option, sukuk_convertible, phantom_share, partner_interest_LLC}
- quantity
- ownership_percentage (computed)
- profit_allocation_percentage (separate field — see B.2)
- voting_percentage (separate from ownership in non-voting preferred classes)
- pledged: boolean + pledge_record_id
- transfer_restrictions: enum {locked, ROFR_required, drag_eligible, tag_eligible, free}

**Vesting schedules** (for options and restricted shares)
- cliff_period, total_period, schedule_type {monthly, quarterly}
- vested_to_date, exercised_to_date, expired_to_date
- on_termination_behavior

**Capital change events**
- date, type {issuance, transfer, repurchase, conversion, capital_increase, capital_decrease}
- regulatory_approval_required: boolean + approval_record_id
- documents: linked
- pre_state, post_state snapshots of cap table

**Filings**
- moc_filings (commercial registry updates required)
- cma_filings (for ESOP exempted-offer notifications)
- zatca_records (for zakat reporting impact)

This is the floor, not the ceiling. The model expands as features expand.

---

## Section K — Disclaimers and what to validate with counsel
## القسم ك — التنبيهات والمسائل التي تتطلب مراجعة قانونية

**This document is operational research, not legal advice.** Before any of the following appears in customer-facing copy, contracts, regulatory filings, or marketing claims, validate with a Saudi-qualified corporate lawyer:

1. **The exact procedural requirements** for ESOP establishment in unlisted SJSCs (the published guidance is partial — practice varies).
2. **The interaction between sukuk-based convertible instruments and the LLC capital structure** — Article 179 enables debt issuance, but the path from sukuk to equity conversion needs careful structuring.
3. **The threshold and timing for MoC filings** triggered by cap table changes — specific articles of the New Law and Implementing Regulations.
4. **Whether and when the cap table software's outputs (share certificates, partner registers, capital change resolutions) carry legal force** without separate notarization.
5. **The treatment of foreign founders/shareholders** — MISA licensing implications when foreign ownership is present in any percentage.
6. **The interaction with Saudi Labor Law** for ESOP grants to employees (notice periods, end-of-service benefits, etc.).

**Recommended next step:** within 30 days of customer-discovery sprint completion, retain a Saudi corporate lawyer (suggested firms based on Saudi market familiarity: Bracewell, BSA, Hammad & Al-Mehdar, Ghazzawi & Partners, Eyad Reda) for a 2-hour scoping session. Cost: estimated SAR 3,000–8,000 for the session. This is the cheapest insurance the project can buy.

---

## Sources
## المراجع

Primary law:
- **Companies Law** — Royal Decree M/132 dated 1/12/1443H (28 June 2022). Effective 19 January 2023. Full text: [argaamplus PDF](https://argaamplus.s3.amazonaws.com/8d8944cf-ae2f-47b7-b4fd-f8c052939791.pdf)
- **Implementing Regulation of the Companies Law for Listed Joint Stock Companies** (2024) — [CMA PDF](https://cma.gov.sa/en/RulesRegulations/Regulations/Documents/ImplementingRegulationoftheCompaniesLawforListedJointStockCompanies_EN_2024.pdf)

Law firm commentary (cited throughout):
- [Bracewell — New Saudi Companies Law 2022](https://www.bracewell.com/resources/new-saudi-companies-law-2022-key-changes-and-next-steps-companies-ksa/)
- [BSA Law — The New Companies Law in KSA](https://www.bsalaw.com/insight/the-new-companies-law-in-the-kingdom-of-saudi-arabia-what-to-expect/)
- [Jarbou Law — New Saudi Commercial Companies Law](https://aljarboulaw.com/new-saudi-commercial-companies-law-important-changes-and-reforms/)
- [Saudi Legal — Companies & Partnerships](https://www.saudilegal.com/saudi-law-overview/companies-and-partnerships)
- [Saudi Legal — Capital Markets](https://www.saudilegal.com/saudi-law-overview/capital-markets)
- [Eyad Reda Law Firm — Companies Law](https://erlf.com/publications/companies-law/)
- [Ghazzawi Law Firm — LLC Provisions](https://www.ghazzawilawfirm.com/insights/provisions-for-llcs-under-new-saudi-arabian-companies-law/)
- [Batic Law Firm — New Saudi Companies Law](https://baticfirm.com/saudi-companies-law/)
- [Hammad & Al-Mehdar — ESOPs in UAE and Saudi Arabia](https://hmco.com.sa/how-esops-are-transforming-employee-compensation-in-the-uae-and-saudi-arabia/)
- [SAVCPEA — ESOP in Startups](https://vcpea.org.sa/en/newsletter/what-is-an-employee-stock-ownership-plan-esop-in-a-startup/)
- [Insights KSA — ESOP for Vision 2030 Companies](https://insightss.co/blogs/esop-for-vision-2030-companies/)
- [Misk Hub — ESOP in Startups](https://hub.misk.org.sa/insights/entrepreneurship/2025/what-is-an-employee-stock-ownership-plan-esop-in-a-startup/)
- [Carta — ESOPs UAE/KSA](https://carta.com/blog/esops-uae-ksa/)
