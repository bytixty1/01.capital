# 01 Capital — Cap Table Software for Saudi Startups

> Working name. Final product naming happens after discovery validation.

This repository contains the technical implementation, architecture, and supporting documentation for 01 Capital's cap table software product. It does **not** contain operational tracking, sales pipelines, learning logs, or general project journey artifacts — those live in the team's Notion workspace.

---

## What this product is

A cap table and equity management platform built for the Saudi startup ecosystem. Designed natively around the 2023 Saudi Companies Law — Simplified Joint Stock Companies (SJSC), Limited Liability Companies (LLC), Employee Share Plans, sukuk-based convertible instruments, family business charters, and Capital Market Authority disclosure requirements.

Existing global tools (Carta, EquityList, Qapita) treat Saudi as a currency feature. This product treats Saudi as a legal-substrate feature.

## What this product is not

- A trading platform or stock market terminal
- A general-purpose accounting or ERP system
- A multi-jurisdiction compliance engine (Saudi-first; other GCC markets are a future expansion question, not a Day 1 commitment)
- An AI-driven decision-support tool. AI is allowed for narrow, optional explanation tasks. The cap table itself is fully deterministic.

---

## Current phase

**Discovery.** No production code beyond foundational scaffolding until validation gates pass. See `docs/discovery/14-day-sprint.md` for the active plan.

---

## Repository structure

```
.
├── CONSULTANT_SPEC.md        # How Claude works with the team
├── README.md                 # This file
├── docs/
│   ├── brand/                # Visual identity, design tokens, copy guidelines
│   ├── decisions/            # Architecture Decision Records (ADRs)
│   ├── discovery/            # Customer discovery sprint, interview script, teardown
│   ├── law/                  # Bilingual digests of Saudi corporate / capital markets law
│   ├── product/              # Product specs, implementation plan, technical architecture
│   └── glossary.md           # Bilingual cap table + corporate law terminology
├── backend/                  # FastAPI service (scaffolded only — no features yet)
├── frontend/                 # Next.js app (scaffolded only — no features yet)
├── shared/                   # Shared contracts, enums, types between BE/FE
├── infra/                    # Docker, docker-compose, deployment configs
└── .github/                  # CI workflows, issue templates
```

---

## Getting started

### Prerequisites
- Node.js 20+
- Python 3.12+
- Docker + Docker Compose
- A Saudi corporate lawyer on speed dial (not joking — see `CONSULTANT_SPEC.md`)

### Setup
```bash
# Clone
git clone https://github.com/ByTixty1/01.Capital.git
cd 01.Capital

# Read the spec first
cat CONSULTANT_SPEC.md
cat docs/product/implementation-plan.md
cat docs/discovery/14-day-sprint.md
```

The codebase is intentionally minimal right now. We do not write features until discovery validates the direction. See the implementation plan for details.

---

## Working with this codebase

### Branching
- `main` is protected. No direct commits.
- Feature branches: `feature/<short-description>`
- Discovery branches: `discovery/<topic>`
- Documentation-only changes can use a single PR.

### Pull requests
- All changes go through PR, even if you are working solo. Future-you reviews present-you.
- PR descriptions reference an ADR if the change is non-trivial.
- Small, frequent PRs beat large infrequent ones.

### Decisions
- Anything non-trivial gets an ADR in `docs/decisions/`.
- ADRs are short (one page), specific, and dated.
- See `docs/decisions/0001-pivot-to-cap-table.md` for the template.

---

## The team

| Role | Person | Responsibilities for this repo |
|------|--------|-------------------------------|
| CEO | Yosef Naytah | Product priorities, partnerships, customer discovery, cannot be the only reviewer on technical PRs |
| CPO | Ali Alghamdi | Product specs, user flows, design reviews, prioritization |
| CDO | Mohammed Alharbi | Brand system, design tokens, marketing site (when applicable), copy review |
| CTO | Abdulelah Alshareef | Architecture, technical ADRs, code review, infrastructure |

---

## Where the rest of the journey lives

This repo is implementation-focused. The broader project — vision, strategy, customer pipeline, sales conversations, learning notes, fundraising materials, ministry relationships — lives in the Notion workspace. Ask Yosef for access.

---

## License

Proprietary. © 01 Capital Tech Solutions. All rights reserved.
