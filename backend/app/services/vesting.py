"""Vesting calculation engine.

Supports cliff + monthly graded vesting (the Saudi ESOP default).
The engine is deterministic — same inputs always produce the same result.
"""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from dateutil.relativedelta import relativedelta


def months_between(start: date, end: date) -> int:
    """Full calendar months elapsed from start to end (inclusive of start month)."""
    delta = relativedelta(end, start)
    return delta.years * 12 + delta.months


def compute_vested(
    grant_date: date,
    vesting_schedule: dict,
    quantity: Decimal,
    as_of: date,
) -> Decimal:
    """
    Returns the number of shares vested as of `as_of`.

    vesting_schedule shapes:
        Time-based:
          { "type": "cliff_monthly", "cliff_months": 12, "total_months": 48 }
        Performance / milestone-based (common in Saudi family-business CEO grants):
          { "type": "performance", "milestones": [
              {"label": "Revenue SAR 10M", "fraction": "0.5", "achieved": true,  "achieved_date": "2026-03-01"},
              {"label": "IPO filing",      "fraction": "0.5", "achieved": false}
          ] }

    Unknown types return 0 to fail safe.
    """
    if as_of < grant_date:
        return Decimal("0")

    schedule_type = vesting_schedule.get("type", "cliff_monthly")

    if schedule_type == "cliff_monthly":
        cliff = int(vesting_schedule.get("cliff_months", 12))
        total = int(vesting_schedule.get("total_months", 48))

        elapsed = months_between(grant_date, as_of)

        if elapsed < cliff:
            return Decimal("0")

        if elapsed >= total:
            return quantity

        vested = (quantity * elapsed / total).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        return min(vested, quantity)

    if schedule_type == "performance":
        # Sum the fractions of milestones achieved on or before `as_of`.
        achieved_fraction = Decimal("0")
        for m in vesting_schedule.get("milestones", []):
            if not m.get("achieved"):
                continue
            achieved_on = m.get("achieved_date")
            if achieved_on:
                try:
                    if date.fromisoformat(achieved_on) > as_of:
                        continue
                except ValueError:
                    pass  # malformed date → treat as achieved without a date gate
            try:
                achieved_fraction += Decimal(str(m.get("fraction", "0")))
            except (ArithmeticError, ValueError):
                continue
        achieved_fraction = min(achieved_fraction, Decimal("1"))
        vested = (quantity * achieved_fraction).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        return min(vested, quantity)

    # Unsupported type — return 0 to be safe
    return Decimal("0")
