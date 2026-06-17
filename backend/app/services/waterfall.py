"""Waterfall + breakpoint analysis engine.

Pure projection — reads the current fully-diluted cap table and distributes a
hypothetical exit value across share classes according to user-supplied
liquidation preferences. Nothing is persisted.

v1 scope:
- Per-class preference inputs (multiplier, participation, cap, original investment)
- Three breakpoint types: common-starts, per-class conversion indifference,
  per-class capped-participating cap-hit
- Independent (non-iterated) convert/don't-convert decision per preferred class
- Synthetic rows (ESOP pool, grants, convertibles) treated as common
"""

import uuid
from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.cap_table import (
    Breakpoint,
    ClassDistribution,
    StakeholderDistribution,
    WaterfallPreference,
    WaterfallRequest,
    WaterfallResponse,
)
from app.services.cap_table import get_cap_table

ZERO = Decimal("0")
SAR = Decimal("0.01")
EPSILON = Decimal("0.01")  # tolerance for convert decision


def _q(x: Decimal) -> Decimal:
    return x.quantize(SAR, rounding=ROUND_HALF_UP)


async def compute_waterfall(
    db: AsyncSession,
    company_id: uuid.UUID,
    req: WaterfallRequest,
) -> WaterfallResponse:
    cap = await get_cap_table(db, company_id, diluted=True)
    exit_value = req.exit_value_sar

    # ── 1. Build class roster from holdings ───────────────────────────────────
    # Group holdings by share_class; track which classes are purely synthetic.
    class_shares: dict[str, Decimal] = defaultdict(lambda: ZERO)
    class_is_synthetic: dict[str, bool] = {}  # all rows synthetic → pure synthetic class
    for h in cap.holdings:
        cls = h.share_class
        class_shares[cls] += h.quantity
        if cls not in class_is_synthetic:
            class_is_synthetic[cls] = h.synthetic is not None
        else:
            class_is_synthetic[cls] = class_is_synthetic[cls] and (h.synthetic is not None)

    # Index user preferences by class
    pref_by_class: dict[str, WaterfallPreference] = {p.share_class: p for p in req.preferences}

    # Effective preference per class: synthetic-only classes are forced to common (mult=0).
    def _effective_pref(cls: str) -> WaterfallPreference:
        p = pref_by_class.get(cls)
        if p and not class_is_synthetic.get(cls, False):
            return p
        return WaterfallPreference(
            share_class=cls,
            seniority=100,  # lowest valid priority; never used (multiplier=0 ⇒ excluded from seniority sort)
            multiplier=ZERO,
            participation="non_participating",
            original_investment_sar=ZERO,
        )

    classes = sorted(class_shares.keys())
    preferred_classes = [c for c in classes if _effective_pref(c).multiplier > 0]
    common_like_classes = [c for c in classes if _effective_pref(c).multiplier == 0]
    total_shares = sum(class_shares.values(), ZERO)

    # ── 2. Per-class convert/don't-convert decision (independent approximation)
    # Pref-due if class doesn't convert: original_investment * multiplier.
    # Convert-value: (class_shares / total_shares) * exit_value (as-if all classes common).
    converted: dict[str, bool] = {}
    pref_due: dict[str, Decimal] = {}
    for c in preferred_classes:
        p = _effective_pref(c)
        pref_due_c = p.original_investment_sar * p.multiplier
        pref_due[c] = pref_due_c
        if total_shares > 0:
            convert_value = (class_shares[c] / total_shares) * exit_value
        else:
            convert_value = ZERO
        # Class converts iff convert_value > pref_value + epsilon AND non-participating
        # (Participating classes never convert — they already get pref + pro-rata.)
        if p.participation == "non_participating" and convert_value > pref_due_c + EPSILON:
            converted[c] = True
        else:
            converted[c] = False

    # ── 3. Pay preferences in seniority order (non-converted only) ────────────
    pool = exit_value
    class_total: dict[str, Decimal] = defaultdict(lambda: ZERO)
    seniority_sorted = sorted(
        preferred_classes,
        key=lambda c: (_effective_pref(c).seniority, c),
    )
    for c in seniority_sorted:
        if converted[c]:
            continue
        pay = min(pool, pref_due[c])
        class_total[c] += pay
        pool -= pay
        if pool <= 0:
            pool = ZERO

    # ── 4. Distribute remainder pro-rata across participants ──────────────────
    # Participants = common_like classes + converted preferred classes
    #              + participating preferred + capped participating preferred
    participating_classes: list[str] = list(common_like_classes)
    for c in preferred_classes:
        p = _effective_pref(c)
        if converted[c]:
            participating_classes.append(c)
        elif p.participation in ("participating", "capped"):
            participating_classes.append(c)
    total_participating_shares = sum((class_shares[c] for c in participating_classes), ZERO)

    if pool > 0 and total_participating_shares > 0:
        for c in participating_classes:
            share = (class_shares[c] / total_participating_shares) * pool
            class_total[c] += share

    # ── 5. Apply caps to capped-participating classes ─────────────────────────
    # If class total > cap_multiplier * original_investment, clip and redistribute
    # the surplus pro-rata across remaining participants (uncapped or under-cap).
    surplus = ZERO
    capped_classes = [
        c for c in preferred_classes
        if (not converted[c]) and _effective_pref(c).participation == "capped"
    ]
    for c in capped_classes:
        p = _effective_pref(c)
        if p.cap_multiplier is None:
            continue
        cap_total = p.cap_multiplier * p.original_investment_sar
        if class_total[c] > cap_total + EPSILON:
            surplus += class_total[c] - cap_total
            class_total[c] = cap_total

    if surplus > 0:
        # Redistribute surplus across participants that aren't fully capped.
        # For v1, treat capped classes that already hit cap as fully out;
        # redistribute among the remainder by share count.
        remainder_classes = [
            c for c in participating_classes
            if c not in capped_classes or _effective_pref(c).cap_multiplier is None
            or class_total[c] < _effective_pref(c).cap_multiplier * _effective_pref(c).original_investment_sar - EPSILON
        ]
        rem_total = sum((class_shares[c] for c in remainder_classes), ZERO)
        if rem_total > 0:
            for c in remainder_classes:
                class_total[c] += (class_shares[c] / rem_total) * surplus

    # ── 6. Build per-stakeholder distributions ────────────────────────────────
    stakeholder_dists: list[StakeholderDistribution] = []
    for h in cap.holdings:
        cls_total = class_total.get(h.share_class, ZERO)
        cls_shares = class_shares[h.share_class]
        if cls_shares > 0:
            dist = (h.quantity / cls_shares) * cls_total
        else:
            dist = ZERO
        pct = (dist / exit_value * 100) if exit_value > 0 else ZERO
        stakeholder_dists.append(
            StakeholderDistribution(
                stakeholder_name=h.stakeholder_name,
                share_class=h.share_class,
                quantity=h.quantity,
                distribution_sar=_q(dist),
                pct_of_exit=pct.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
                synthetic=h.synthetic,
            )
        )

    # ── 7. Build per-class distributions ──────────────────────────────────────
    class_dists: list[ClassDistribution] = []
    for c in classes:
        total_c = class_total.get(c, ZERO)
        pct = (total_c / exit_value * 100) if exit_value > 0 else ZERO
        class_dists.append(
            ClassDistribution(
                share_class=c,
                total_distribution_sar=_q(total_c),
                pct_of_exit=pct.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
                converted=converted.get(c, False),
            )
        )

    # ── 8. Compute breakpoints ────────────────────────────────────────────────
    breakpoints: list[Breakpoint] = []

    # B_common: sum of non-converted, non-participating prefs (the point at which
    # common-like classes start receiving any proceeds). We use the as-modeled
    # convert decisions, so this matches the current scenario.
    common_starts_at = ZERO
    for c in preferred_classes:
        if converted[c]:
            continue
        common_starts_at += pref_due[c]
    if common_starts_at > 0:
        breakpoints.append(
            Breakpoint(
                exit_value_sar=_q(common_starts_at),
                description=f"Common-like classes start receiving proceeds at SAR {_q(common_starts_at):,}",
                breakpoint_type="common_starts",
                share_class=None,
            )
        )

    # B_convert[c] per non-participating preferred class:
    # E* = pref_due_c * total_shares / class_shares_c
    for c in preferred_classes:
        p = _effective_pref(c)
        if p.participation != "non_participating":
            continue
        if class_shares[c] <= 0:
            continue
        e_star = pref_due[c] * total_shares / class_shares[c]
        if e_star > 0:
            breakpoints.append(
                Breakpoint(
                    exit_value_sar=_q(e_star),
                    description=f"{c}: indifferent between taking preference and converting to common at SAR {_q(e_star):,}",
                    breakpoint_type="conversion",
                    share_class=c,
                )
            )

    # B_cap[c] per capped-participating preferred class:
    # pref_due_c + (class_shares_c / total_part_shares) * (E - sum_prefs) = cap * original
    # E = (cap*original - pref_due) * total_part / class_shares + sum_prefs
    for c in preferred_classes:
        p = _effective_pref(c)
        if p.participation != "capped" or p.cap_multiplier is None:
            continue
        if class_shares[c] <= 0:
            continue
        cap_total = p.cap_multiplier * p.original_investment_sar
        # Sum of prefs paid before the cap is reached (non-converted, non-cap)
        sum_prefs_at_cap = sum((pref_due[k] for k in preferred_classes if not converted[k]), ZERO)
        if total_participating_shares <= 0:
            continue
        e_cap = (cap_total - pref_due[c]) * total_participating_shares / class_shares[c] + sum_prefs_at_cap
        if e_cap > 0:
            breakpoints.append(
                Breakpoint(
                    exit_value_sar=_q(e_cap),
                    description=f"{c}: hits participation cap at SAR {_q(e_cap):,}",
                    breakpoint_type="cap_hit",
                    share_class=c,
                )
            )

    breakpoints.sort(key=lambda b: b.exit_value_sar)

    # ── 9. Sum check + response ───────────────────────────────────────────────
    total_distributed = sum((d.distribution_sar for d in stakeholder_dists), ZERO)

    return WaterfallResponse(
        exit_value_sar=_q(exit_value),
        total_distributed_sar=_q(total_distributed),
        stakeholder_distributions=stakeholder_dists,
        class_distributions=class_dists,
        breakpoints=breakpoints,
    )
