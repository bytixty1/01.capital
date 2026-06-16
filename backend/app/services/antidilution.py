"""Anti-dilution adjustment math for preferred shares / convertibles.

Two standard mechanisms, applied when a company raises a down round (new price
below the protected holder's original conversion price):

  - Broad-based weighted average: softens the adjustment by weighting the new
    issue against the whole pre-round fully-diluted base. The common, founder-
    friendlier mechanism.
        CP2 = CP1 × (A + B) / (A + C)
        A = fully-diluted shares outstanding immediately before the new issue
        B = consideration received ÷ CP1  (shares the money "should" have bought)
        C = shares actually issued in the down round

  - Full ratchet: the harshest — the conversion price resets all the way to the
    new (lower) price, regardless of how few shares were issued.

Both return the adjusted conversion price and the extra shares the protected
holder gains on conversion. Pure functions; SJSC-applicable. Not legal advice.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

ZERO = Decimal("0")


@dataclass(frozen=True)
class AntiDilutionResult:
    mechanism: str
    old_conversion_price: Decimal
    new_conversion_price: Decimal
    old_shares_on_conversion: Decimal
    new_shares_on_conversion: Decimal
    extra_shares: Decimal


def _shares(amount_invested: Decimal, price: Decimal) -> Decimal:
    if price <= 0:
        return ZERO
    return (amount_invested / price).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def broad_based_weighted_average(
    *,
    old_conversion_price: Decimal,
    new_issue_price: Decimal,
    pre_round_fd_shares: Decimal,
    new_shares_issued: Decimal,
    amount_invested: Decimal,
) -> AntiDilutionResult:
    a = pre_round_fd_shares
    consideration = new_issue_price * new_shares_issued
    b = consideration / old_conversion_price if old_conversion_price > 0 else ZERO
    c = new_shares_issued
    denom = a + c
    if denom <= 0:
        new_cp = old_conversion_price
    else:
        new_cp = old_conversion_price * (a + b) / denom
    # An up round must never raise the conversion price (anti-dilution only protects downward).
    new_cp = min(new_cp, old_conversion_price)
    old_shares = _shares(amount_invested, old_conversion_price)
    new_shares = _shares(amount_invested, new_cp)
    return AntiDilutionResult(
        mechanism="broad_based_weighted_average",
        old_conversion_price=old_conversion_price,
        new_conversion_price=new_cp.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
        old_shares_on_conversion=old_shares,
        new_shares_on_conversion=new_shares,
        extra_shares=max(new_shares - old_shares, ZERO),
    )


def full_ratchet(
    *,
    old_conversion_price: Decimal,
    new_issue_price: Decimal,
    amount_invested: Decimal,
) -> AntiDilutionResult:
    new_cp = min(new_issue_price, old_conversion_price)
    old_shares = _shares(amount_invested, old_conversion_price)
    new_shares = _shares(amount_invested, new_cp)
    return AntiDilutionResult(
        mechanism="full_ratchet",
        old_conversion_price=old_conversion_price,
        new_conversion_price=new_cp.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
        old_shares_on_conversion=old_shares,
        new_shares_on_conversion=new_shares,
        extra_shares=max(new_shares - old_shares, ZERO),
    )
