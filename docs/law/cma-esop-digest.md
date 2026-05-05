# CMA ESOP Regulations — Cap Table Digest
# لوائح هيئة السوق المالية لبرامج أسهم الموظفين — ملخص لجدول الملكية

> **Status:** Operational digest. Citations to the CMA's published Implementing Regulation of the Companies Law for Listed Joint Stock Companies (2024) and to law-firm commentary. Validate with a Saudi corporate / capital markets lawyer before any ESOP product feature is shipped to a customer for real ESOP execution.
>
> **Scope note:** This digest is most directly relevant to listed JSCs. For unlisted SJSCs and LLCs (where most of our customers will live), the regime is lighter but still has CMA disclosure touchpoints. Both are covered below.

---

## 1. Regulatory landscape

ESOPs in Saudi Arabia sit at the intersection of three regulatory frameworks:

1. **The Companies Law (2023)** — provides the legal foundation. Article 72(2)(b) makes reference to employee incentive schemes by allowing the issuance of shares to employees.
2. **CMA Corporate Governance Regulations** — provide structure for design, disclosure, and governance. They mandate transparent disclosure regarding employee share ownership plans, including the number of shares to be issued, the specific terms of the plans, and the criteria for employee eligibility.
3. **CMA Implementing Regulation of the Companies Law for Listed Joint Stock Companies (2024)** — provides specific procedural rules for listed companies' ESOPs.

For unlisted companies, an ESOP is generally an **exempted offer** that does not trigger the full filing burden of public offerings. ESOPs are generally considered an exempted offer and do not trigger filing requirements.

---

## 2. ESOP path for unlisted companies (most of our customers)

This is the regime that applies to LLCs and SJSCs — where the bulk of our MVP customer base will be.

### 2.1 Required steps

1. **Articles of Association amendment.** The company's articles of association must explicitly allow for share purchases for employee allocation. If the AoA is silent or prohibitive, it must be amended *first* via Extraordinary General Assembly resolution.

2. **Extraordinary General Assembly approval.** The EGA approves the ESOP plan. The General Assembly may authorise the Board to determine the terms of the plan including the allocation price for each Share offered to employees if offered for consideration.

3. **Board resolution(s)** establishing plan terms (price, vesting, eligibility) within EGA-authorized parameters.

4. **Plan documentation.** Plan rules, individual grant agreements, and (eventually) employee-facing summaries.

5. **Documentation maintenance.** Detailed records of share allocations, vesting schedules, and employee agreements.

6. **Quarterly CMA disclosure.** The CMA does impose specific disclosures: quarterly notifications detailing the total number and value of the exempted offers and reporting on any ongoing ESOP offers.

### 2.2 Eligibility constraints

- **Non-executive Board members** shall not participate in the Employees' Shares plan.
- **Executive Board members** shall not vote on Board resolutions relating to the plan.

### 2.3 What "exempted offer" status gives you

ESOP grants under this regime are exempted from the full prospectus and offering requirements that normally apply to securities offerings. This designation allows employers to issue unlisted, contract-based securities to employees without being subject to the full scope of applicable Capital Market Authority (CMA) regulations.

What you still must do:
- Quarterly CMA notification (above)
- Internal documentation
- ZATCA/zakat consideration (see Section 5)
- Disclosures to participating employees (terms, risks, vesting)

What you don't have to do:
- File a full prospectus
- Get CMA pre-approval of each grant
- Use a licensed financial advisor

---

## 3. Common Saudi ESOP design patterns

### 3.1 Vesting schedules

The dominant pattern in Saudi (and broader Middle East) startups:

- 67% of grants in Middle East startups follow a four-year vesting schedule with a one-year cliff. The regional norm for structure is 25% of equity vests after the first year and the remaining 75% vests monthly thereafter.

In product terms, this means:

- **Default schedule:** 4 years total, 1 year cliff, monthly vesting after cliff
- **Quarterly vesting** is the second-most-common alternative
- **Custom schedules** must be supported but should not be the path of least resistance

### 3.2 Vesting types

- **Time-based:** standard, employee just needs to remain employed
- **Milestone-based:** vests on hitting performance milestones (less common, harder to administer)
- **Hybrid:** mix of time and milestones
- **Acceleration triggers:** common provisions
  - Single-trigger: accelerates on acquisition alone
  - Double-trigger: requires acquisition *and* termination without cause

### 3.3 Exercise mechanics

For options (right to buy at strike price):
- **Exercise window:** typically 90 days post-termination for vested options
- **Cashless exercise:** employee receives net shares after subtracting strike cost (less common in Saudi due to lack of established secondary market)
- **Early exercise:** employee can exercise unvested options to start ownership tax clock (Saudi tax-irrelevance reduces this incentive)

### 3.4 Buyback / repurchase clauses

A meaningful Saudi-specific feature: it is common for companies to retain a buyback right when an employee leaves. Implementing buyback clauses: This allows the company to repurchase shares if an employee leaves.

Buyback structures vary:
- At fair market value
- At strike price (effectively forfeiture)
- At a defined formula
- Linked to liquidity event (Tying exercise to a liquidity event: This ensures that options are exercisable only upon an IPO or acquisition)

### 3.5 Phantom shares

When real equity issuance is constrained (foreign ownership restrictions, AoA limitations, family company politics), phantom shares offer an alternative: Using alternative equity incentives: One example is to offer phantom shares, which provide cash rewards based on share price appreciation without actual equity transfer.

Mechanics:
- No actual equity issued
- On a vesting / liquidity event, employee receives cash equal to the appreciation
- No cap table impact (employees never become shareholders)
- Accounted as a liability, not equity

---

## 4. Listed-company ESOPs (for customers who go public)

For customers who eventually convert their SJSC to a JSC and list on Tadawul, additional rules apply:

### 4.1 EGA approval requirements

In addition to the other requirements of a share buy-back, the company must obtain the Extraordinary General Assembly's approval on the Employees' Shares plan.

### 4.2 Treasury shares

Listed companies can fund ESOPs through buying back shares (creating treasury shares) and allocating them to employees. The Extraordinary General Assembly shall determine, within its resolution approving the Share buy-back transaction, the maximum time period during which the Company may retain its Treasury Shares without selling them or allocating them to its employees.

If treasury shares are not allocated within the specified period, the company must take necessary regulatory procedures to cancel these Shares within a period not exceeding six months after the end of that period, unless the Extraordinary General Assembly resolved to extend the period.

### 4.3 Disclosure in annual reports

100% of publicly listed companies now explicitly detail their ESOPs in annual reports, with 88% receiving "Fully Compliant" ratings from auditors on these disclosures.

### 4.4 Capital increase route

As an alternative to treasury shares, listed companies can fund ESOPs via capital increase (issuing new shares specifically for the plan). This requires standard capital-increase procedures.

---

## 5. Zakat and tax treatment

### 5.1 Personal income tax

Saudi Arabia currently has no personal income tax, so employees face no immediate tax liability when receiving, vesting, or exercising ESOP shares.

This is a meaningful simplification compared to the US (where ISO/NSO distinctions, AMT, holding periods, and 83(b) elections create complexity) and the UK (where EMI/non-EMI status drives wildly different outcomes).

### 5.2 Zakat impact on the company

ESOPs affect zakatable assets. The company must work with financial advisors to ensure ESOPs are properly accounted for in Zakat calculations.

ZATCA has issued 12+ new clarification guides in 2025 specifically addressing the income tax and Zakat treatment of employee equity, reducing ambiguity.

**Cap table product implication:** The product should generate or export ESOP-related figures the company's accountant needs for zakat reporting:
- Number of shares issued / vested / exercised in the zakat year
- Strike price totals collected (if any)
- Treasury share holdings related to ESOP
- Outstanding option pool (granted but unexercised)

The product does *not* compute zakat. It feeds the zakat process.

### 5.3 Foreign employees and withholding

For non-Saudi employees, the situation differs based on residency status and tax treaties. This is a known complication and a place to flag legal review. Do not assume foreign employees have the same treatment as Saudi nationals.

---

## 6. Approval timelines

For listed-company ESOPs requiring CMA approval: The average regulatory approval time for a new ESOP plan with the CMA has decreased by over 40% since 2023, now averaging 6-8 weeks for compliant applications.

For unlisted companies (exempted offers), approval is internal (EGA + Board) and can be completed in days if the AoA already permits ESOPs, or weeks if AoA amendment is needed.

**Cap table product implication:** support both timelines. For unlisted companies, optimize for "ESOP live within 30 days of customer kickoff." For listed companies, model the longer CMA pathway.

---

## 7. Compliance disputes and case law

As of Q1 2026, the Commercial Courts have resolved over 30 ESOP-related disputes, establishing crucial precedents on vesting and forfeiture, with ~75% of rulings upholding the company's position when documentation was clean.

**The product implication is sales-facing:** clean documentation wins disputes. The product is the documentation engine. This is a sales narrative, not just a feature.

---

## 8. Cap table product feature requirements

Derived from sections 1-7:

### 8.1 Core ESOP features (MVP)

- **Plan setup wizard:** AoA check → EGA resolution template → board resolution template → plan rules document
- **Eligibility tracking:** employee, role, hire date, executive vs non-executive distinction (matters for plan participation rules)
- **Grant management:** issue, modify, revoke; per-employee history
- **Vesting engine:** 4-year/1-year cliff default, monthly accrual, custom schedule support
- **Exercise tracking:** option → share conversion, strike price collection, post-termination windows
- **Buyback execution:** trigger conditions, valuation method, transaction recording
- **Phantom share support:** as a separate instrument type with cash settlement
- **Quarterly CMA disclosure pack:** auto-generated, ready for the company to submit

### 8.2 V2 features

- **Acceleration triggers** (single/double on acquisition)
- **Treasury share management** (for listed customers)
- **Zakat data exports** structured for ZATCA-aligned accounting
- **Multi-plan support** (one company running multiple plan types simultaneously)
- **Employee self-service portal** (employees view their grants, vesting, exercise)

### 8.3 Things we explicitly do *not* do in MVP

- Compute zakat or tax. We feed the accountant; we are not the accountant.
- Generate legally binding documents without "DRAFT — REVIEW WITH COUNSEL" watermarks.
- Pre-fill regulatory submissions to ZATCA or CMA. We export structured data; the company's filer submits.
- Provide legal advice on plan design. We provide templates and structure; legal counsel customizes.

---

## 9. Sources

- [CMA — Implementing Regulation of the Companies Law for Listed Joint Stock Companies (2024)](https://cma.gov.sa/en/RulesRegulations/Regulations/Documents/ImplementingRegulationoftheCompaniesLawforListedJointStockCompanies_EN_2024.pdf)
- [CMA Home Page (announcements and disclosures)](https://cma.gov.sa/en/Pages/default.aspx)
- [Hammad & Al-Mehdar Law Firm — How ESOPs are transforming employee compensation in the UAE and Saudi Arabia](https://hmco.com.sa/how-esops-are-transforming-employee-compensation-in-the-uae-and-saudi-arabia/)
- [Carta — ESOPs UAE/KSA](https://carta.com/blog/esops-uae-ksa/)
- [SAVCPEA + Hammad & Al-Mehdar — ESOP in Startups](https://vcpea.org.sa/en/newsletter/what-is-an-employee-stock-ownership-plan-esop-in-a-startup/)
- [Misk Hub — ESOP in Startups](https://hub.misk.org.sa/insights/entrepreneurship/2025/what-is-an-employee-stock-ownership-plan-esop-in-a-startup/)
- [Insights KSA — ESOP for Vision 2030 Companies](https://insightss.co/blogs/esop-for-vision-2030-companies/)

---

## What to validate with counsel before customer launch

1. The exact procedural mechanics for **EGA approval of an ESOP for an SJSC** (versus listed JSC, where the Implementing Regulation provides explicit guidance).
2. The interaction of **AoA amendment requirements** with company conversion (LLC → SJSC, SJSC → JSC).
3. The **scope of "exempted offer"** treatment — is it automatic, or does it require any CMA pre-acknowledgment?
4. **Foreign employee** ESOP treatment, including any Saudi labor law touchpoints.
5. **Specific format and content requirements for quarterly CMA notifications** — what data fields, what file format, what submission portal.
