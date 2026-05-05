# ADR-0006 — Data Residency

**Status:** Accepted  
**Date:** 2026-05-05  
**Author:** Abdulelah (CTO)

---

## Context

01 Capital handles legally sensitive corporate data: shareholder registers, national IDs (for identity verification), IBAN-linked equity instruments, board resolutions, and cap table events that form part of a company's official record. Saudi founders and their lawyers will ask where this data lives before signing up.

Saudi Arabia has a Personal Data Protection Law (PDPL, effective 2023) and government guidance that encourages data residency for sensitive corporate data. While PDPL does not universally mandate local residency, enterprise customers and government-affiliated entities (including those advised by Monsha'at or CMA-regulated funds) may require it contractually.

---

## Decision

**Production customer data runs on Saudi-hosted infrastructure.**

Default region: **AWS Bahrain (me-south-1)** — the nearest AWS region with full compliance features (VPC, KMS, CloudTrail, dedicated tenancy options).

Development and staging environments may run anywhere (laptop Docker, any cloud region).

---

## Rationale

**AWS Bahrain (me-south-1)** is the mature, low-risk choice:
- Nearest AWS region to Saudi Arabia with a full service catalogue.
- Already used by major Saudi enterprises (STC, SABIC partners, government tech programmes).
- Meets the "data processed and stored in KSA or neighboring GCC" expectation that Saudi lawyers typically accept.
- IAM, KMS, CloudTrail, RDS encryption at rest — all available without workarounds.

**Why not Saudi-hosted alternatives (STC Cloud, Elm)?**  
These are viable V2+ options as the government procurement channel matures. For V1 with a small customer base, AWS Bahrain offers faster onboarding, better tooling, and lower operational risk. An ADR amendment will be required if a government or enterprise customer contractually demands STC Cloud or bare-metal Saudi hosting.

**Why not us-east-1 or eu-west-1?**  
Unacceptable customer and legal risk. Even without a hard legal prohibition, a customer's lawyer discovering their cap table data is in Virginia would likely kill the contract. The asymmetry is: moving to me-south-1 costs nothing extra in setup, but moving away from it later requires a data migration.

---

## Consequences

- Infrastructure-as-code (Terraform/CDK, Sprint 7) targets `me-south-1` by default.
- Any infrastructure change that would move production data outside me-south-1 requires this ADR to be updated and team sign-off.
- Backup storage (S3) also stays in me-south-1 — no cross-region replication to outside GCC without an explicit decision.
- CI/CD pipelines may run on GitHub-hosted runners (us-east-1) — only runtime customer data must be in me-south-1.

---

## Alternatives considered

| Alternative | Reason rejected |
|---|---|
| us-east-1 | Customer trust and legal risk outweigh cost savings |
| eu-west-1 (Ireland) | Same risk; slightly better latency but still outside GCC |
| STC Cloud | Evaluated as V2+ option; tooling maturity not ready for V1 pace |
| Dedicated bare-metal (Saudi DC) | Operationally prohibitive for a 4-person team at this stage |
