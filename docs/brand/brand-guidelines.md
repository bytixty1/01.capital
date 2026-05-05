# ZeroCaps Brand Guidelines

> Inherits ZeroOne's visual identity: dark premium surfaces, restrained purple accent, professional typography. Adapted for a compliance-grade B2B context — even more restrained than the parent brand.

---

## Voice and tone

**Voice:** measured, confident, precise. We are the calm professional in the room when founders are panicking about a fundraising-round paperwork deadline.

**Tone:** never playful. Never breezy. The cap table is a legal document. We sound like the kind of company a lawyer would respect.

**Do:**
- "Your cap table reflects 12 stakeholders across 2 share classes."
- "Article 113 of the Companies Law allows drag-along rights when the AoA expressly provides for them."
- "Your last grant vested 25% on 2025-08-12. The next 75% vests monthly through 2028-08-12."

**Don't:**
- "🎉 Congrats on your new hire! Let's get them their equity!"
- "Cap tables made fun!"
- "Sleek and modern equity management"

---

## Colors

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-base` | #0a0a0c | Page background |
| `--bg-surface` | #131316 | Card / panel surface |
| `--bg-elevated` | #1a1a1f | Elevated surface (modals, popovers) |
| `--brand-purple` | #a67dfa | Primary accent — sparingly used |
| `--brand-purple-hover` | #b28ffc | Interactive hover |
| `--brand-purple-active` | #9367ed | Pressed state |
| `--text-primary` | #ededf0 | Body text |
| `--text-secondary` | #a8a8b3 | Secondary copy |
| `--text-tertiary` | #6e6e7a | Captions, metadata |
| `--pos` | #4ade80 | Positive financial values |
| `--neg` | #f87171 | Negative financial values |
| `--warn` | #facc15 | Warnings |
| `--info` | #60a5fa | Informational |

Purple is a *seasoning*, not a base. If a screen has more than 3 purple elements, it's wrong.

---

## Typography

**Sans-serif:** Inter (Latin) + IBM Plex Sans Arabic (Arabic, when bilingual). Inter for now; Arabic font selection finalizes during V1.5 Arabic UI work.

**Monospace:** JetBrains Mono. Used for:
- All numbers (share counts, percentages, currency amounts)
- Code, IDs, hashes
- Tabular alignment

The shift to mono for numbers is non-negotiable. Tabular numerics make cap tables readable; proportional numerics make them confusing.

### Type scale

| Element | Size | Weight |
|---------|------|--------|
| Page title | 32px | 700 |
| Section header | 24px | 600 |
| Card title | 18px | 600 |
| Body | 14px | 400 |
| Caption | 12px | 400 |
| Mono / numeric | inherit | 500 |

---

## Iconography

**Source:** Lucide. Outlined, 1.5px stroke. Never filled icons except for status indicators (green/red dots).

**Don't:**
- Mix icon styles (outlined and filled in the same view)
- Use decorative icons that don't add information
- Use emojis anywhere in the product UI

---

## Component patterns

**Tables:** dense by default. The user is here to see data, not breathe. Cell padding: 8px vertical, 12px horizontal. Borders subtle.

**Buttons:**
- Primary: purple bg, white text, used for the *one* main action per screen
- Secondary: bordered, transparent bg, neutral text
- Tertiary / link: text-only, purple hover

**Forms:**
- Labels above inputs, never floating
- Required fields marked with a single asterisk in `--brand-purple`
- Validation errors in `--neg`, below the field, in body size — no shouting

**Cards / panels:**
- 1px border in `--border-default`
- Optional 3px left border in `--brand-purple` for emphasis (callouts, highlights)
- 16-24px internal padding
- No drop shadows on dark surfaces — they don't read

---

## Charts

**Default palette for data visualizations:**
- Primary line / bar: `--brand-purple`
- Secondary: `#7da6fa` (a complementary blue)
- Tertiary: `#fa9d7d` (a warm complement)
- Neutral: `--text-secondary`

Cap table waterfall / dilution charts: use a sequential purple ramp (light to dark) so each series is visually distinguished without competing with brand color.

---

## Logo usage

ZeroOne logo (parent brand) appears in the top-left of authenticated views and on the marketing site. Minimum size: 24px height. Clear space: 1x logo height on all sides.

ZeroCaps wordmark (when finalized after discovery) appears below or beside the logo, never on top of it.

---

## Customer-facing copy principles

1. **Cite the law when making compliance claims.** "Per Article 72(2)(b), employee shares require..." beats "We handle ESOPs."
2. **Be precise about timelines.** "Within 30 days" beats "soon."
3. **Avoid superlatives.** Say what the product does. Don't say it's the best.
4. **Bilingual readiness.** Every customer-facing string ships with an Arabic counterpart eventually. UI copy should be written with translation in mind — short, declarative, not idiomatic.
5. **Watermark drafts.** Every generated document not yet reviewed by counsel says "DRAFT — REVIEW WITH LEGAL COUNSEL" prominently.

---

## Design partner principle

Mohammed (CDO) owns the brand. Code-side use of brand tokens routes through him for review until V1 ships. After V1, the brand book version-locks and only major updates go through review.
