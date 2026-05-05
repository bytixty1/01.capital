# ZATCA & Ministry of Commerce — Cap Table Filing Notes
# الإيداعات لدى الزكاة والضريبة ووزارة التجارة — ملاحظات لجدول الملكية

> **Status:** Practical filing notes for product design. NOT a comprehensive procedural guide. Many specifics are operational, change frequently, and require validation with the company's accountant or with ZATCA/MoC directly. The product surfaces required filings; the customer (or their professional advisor) submits them.

---

## 1. Why this matters for the product

Every change to a Saudi company's cap table can trigger one or more regulatory filings:

- **Ministry of Commerce (MoC):** keeps the official Commercial Registry. Changes to ownership, capital, AoA all require MoC updates.
- **Zakat, Tax and Customs Authority (ZATCA):** processes corporate zakat and tax obligations, including those affected by equity instruments.
- **Capital Market Authority (CMA):** for listed companies, specific equity events (capital changes, ESOP plans) require disclosure. Covered in `cma-esop-digest.md`.

A cap table product that knows which event triggers which filing is genuinely useful. A cap table product that *files* those forms is in a much heavier regulatory zone — for MVP, we surface and structure; we do not submit.

---

## 2. Ministry of Commerce filings

### 2.1 What MoC cares about

The Commercial Registry is the official ownership record at the entity level. MoC tracks:

- Company existence and legal status
- Articles of Association content
- Authorized signatories / managers / directors
- Capital structure (paid-in capital, contribution types)
- Major ownership changes (especially for LLCs)

### 2.2 Cap table events that trigger MoC filings

| Event | MoC filing required? | Notes |
|-------|---------------------|-------|
| New shareholder / partner added | **Yes** for LLCs (partner register update). For JSCs/SJSCs, depends on AoA and threshold. | LLC partner changes typically require AoA amendment. |
| Existing shareholder transfers shares | **Yes** for LLCs. JSC/SJSC: only if cumulative changes affect signatories or major control. | ROFR period must complete first for LLCs. |
| Capital increase | **Yes**, always | Triggers AoA amendment + new capital evidence. |
| Capital decrease | **Yes**, always | Requires creditor protection compliance. |
| Conversion (LLC → SJSC, SJSC → JSC) | **Yes**, always | Major filing event. |
| Manager / director change | **Yes**, always | Authorized signatory updates. |
| AoA amendment for any reason | **Yes**, always | Including ESOP enabling, drag/tag rights, profit allocation changes. |
| ESOP grant to existing employee | **No** | If AoA already permits and ESOP doesn't change capital. |
| Vesting tick (no transaction) | **No** | Internal company event. |
| Option exercise (issuing new shares) | **Yes** | Capital change. |
| Option exercise (treasury shares to employee) | Depends on entity type and existing permissions. |

### 2.3 Founders' joint liability

A reminder relevant to product copy and sales narrative:

Founders, partners, managers of a company or members of its board of directors are jointly liable for damages resulting from a failure to register the articles of association or bylaws and any amendments thereto with the Commercial Registry.

**Translation:** if the cap table changes and the MoC isn't updated, the managers can be personally liable for resulting damages. The cap table product preventing missed filings is a direct liability-mitigation feature.

### 2.4 Product implications

- **Filing tracker:** every cap table event creates a filing record with status (required / pending / submitted / confirmed / not required).
- **Document generation (drafts):** AoA amendment drafts, capital change resolutions, partner register updates — generated as DRAFTs with watermark.
- **Filing reminders:** time-bounded events (e.g., AoA amendments must be filed within statutory windows) get automatic reminders.
- **Audit trail:** every filing record links to the underlying cap table event(s) and to documents — a "what changed and why" history.

---

## 3. ZATCA touchpoints

### 3.1 The product is not a tax tool

To set expectations clearly: the cap table product does **not** compute zakat, calculate corporate tax, or generate tax filings. ZATCA work is the company's accountant's job. The product feeds the accountant.

### 3.2 What ZATCA cares about

For Saudi-domiciled companies:

- **Zakat** (for Saudi/GCC-owned portions of the business)
- **Corporate income tax** (for foreign-owned portions and certain entity structures)
- **VAT** (for the company's operations — not directly cap-table related)
- **Withholding tax** (for payments to non-residents — rarely cap-table related)
- **End-of-service benefits and labor-related obligations** (for employees with equity, where ESOP intersects with labor law)

### 3.3 Cap table data ZATCA cares about

- **Ownership composition** by nationality (Saudi/GCC vs foreign — affects zakat vs income tax allocation)
- **Capital structure** (paid-in capital is part of zakat base calculation)
- **ESOP issuances** and their accounting treatment
- **Treasury share holdings**
- **Major ownership changes during the zakat year**

### 3.4 Recent ZATCA guidance on equity

ZATCA has issued 12+ new clarification guides in 2025 specifically addressing the income tax and Zakat treatment of employee equity, reducing ambiguity.

This is good news for the product: the official guidance has gotten more specific, which means our exports to accountants can be more structured. As the discovery sprint validates customer pain, mapping our data exports to specific ZATCA guidance becomes an explicit product step.

### 3.5 Product implications

- **Zakat-year exports:** structured data exports filtered to a zakat year, formatted for accountant ingestion.
- **Nationality field on stakeholders:** required for zakat allocation.
- **Tax category flags:** e.g., "this stakeholder is a Saudi national / GCC national / foreign individual / foreign entity."
- **Period-end snapshots:** the cap table state at the close of each zakat year, frozen and exportable.
- **Do NOT:** auto-fill ZATCA forms, compute zakat amounts, or claim tax compliance.

---

## 4. Filing event taxonomy

A clean taxonomy for the product to use:

```
FilingEvent {
  trigger: CapTableEvent
  authority: enum {MoC, CMA, ZATCA}
  required: boolean
  deadline: date | null
  status: enum {required, draft_ready, submitted, confirmed, not_required}
  documents: [DraftDocument]
  audit_trail: [AuditEntry]
}
```

For each cap table event type, we define which filings it triggers, in what window, with what supporting docs.

This is the structural backbone of the "filing tracker" feature.

---

## 5. What the product does and does not do

**The product does:**
- Detect that a cap table event triggers a filing
- Generate draft documentation for the filing
- Track filing status
- Remind the company before deadlines
- Export structured data for accountants
- Audit trail every event

**The product does not (in MVP):**
- Submit filings on the customer's behalf
- Compute zakat or tax amounts
- Replace the company's lawyer or accountant
- Guarantee compliance — the company is responsible for actual submission and accuracy

**Sales narrative:**
> "We don't replace your lawyer or your accountant. We make their work cheaper and their oversight tighter."

---

## 6. Compliance integrations to evaluate (post-MVP)

Once the basic product is live and customers exist, evaluate direct integrations with:

- **MoC e-services** (for one-click filing submission)
- **ZATCA portal** (for structured data submission)
- **CMA portal** (for listed company customers)

These are V2+ ambitions. They require partnership conversations with each authority, which open up only after the team has paying customers and credibility.

---

## 7. What to validate with a Saudi accountant + lawyer

Before any specific filing-related claim is made to a customer:

1. **Exact MoC filing windows** for each cap table event type — these are specified in the Companies Law Implementing Regulations and can change.
2. **The format and content of the partner register** the MoC accepts for LLCs.
3. **The boundary between "draft" and "official" documents** — at what point does a generated AoA amendment carry legal weight?
4. **Zakat year alignment** for companies with non-calendar fiscal years.
5. **The current status of any e-filing portals** — are they accepting third-party-generated documents, or only their native templates?

---

## 8. Sources

- Companies Law (Royal Decree M/132, 2022)
- [Saudi Legal — Companies & Partnerships](https://www.saudilegal.com/saudi-law-overview/companies-and-partnerships)
- [Insights KSA — ESOP Tax Authority Guidance (ZATCA)](https://insightss.co/blogs/esop-for-vision-2030-companies/)
- [Murtakaz — Startup Funding in Saudi Arabia (mentions ZATCA filing for ESOPs)](https://www.murtakazai.com/startup-funding-saudi-arabia-guide)
- ZATCA published guides (referenced via secondary sources; primary ZATCA documents should be retrieved directly when implementing specific features)
- MoC e-services portal documentation (to be retrieved during implementation)
