"""Convertible-instrument conversion math.

Computes how many shares a sukuk-convertible, convertible note, SAFE-equivalent,
or warrant converts into at a priced round. Pure and deterministic — the caller
decides whether to persist the result (the convert endpoint) or just preview it.

Conversion price selection (lowest applicable price wins, standard for the
investor's benefit):
  - explicit `conversion_shares` in terms → fixed share count
  - explicit `conversion_price` in terms → principal / conversion_price
  - otherwise (SAFE / note): min(discount price, valuation-cap price)

Principal = face_value, plus accrued profit/interest for notes when an
`accrued_amount` is supplied. Sharia note: profit on sukuk is a pre-agreed
profit share, not interest — modelled identically here as an added principal.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal


@dataclass(frozen=True)
class ConversionResult:
    shares: Decimal
    conversion_price: Decimal | None
    method: str  # fixed_shares | fixed_price | discount | valuation_cap
    principal: Decimal


def _d(v) -> Decimal | None:
    if v is None or v == "":
        return None
    try:
        return Decimal(str(v))
    except Exception:
        return None


def compute_conversion(
    *,
    instrument_type: str,
    face_value: Decimal | None,
    terms: dict,
    round_price_per_share: Decimal | None = None,
    pre_money_shares: Decimal | None = None,
    accrued_amount: Decimal | None = None,
) -> ConversionResult:
    """Return the conversion outcome for a convertible instrument.

    Raises ValueError when the inputs are insufficient to determine a price.
    """
    terms = terms or {}
    principal = (face_value or Decimal("0")) + (accrued_amount or Decimal("0"))

    # 1. Fixed share count.
    fixed_shares = _d(terms.get("conversion_shares"))
    if fixed_shares is not None:
        price = (principal / fixed_shares) if (principal > 0 and fixed_shares > 0) else None
        return ConversionResult(
            shares=fixed_shares.quantize(Decimal("1"), rounding=ROUND_HALF_UP),
            conversion_price=price,
            method="fixed_shares",
            principal=principal,
        )

    # 2. Fixed conversion price.
    fixed_price = _d(terms.get("conversion_price"))
    if fixed_price is not None and fixed_price > 0:
        if principal <= 0:
            raise ValueError("Instrument has no face value to convert at the fixed conversion price")
        shares = (principal / fixed_price).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        return ConversionResult(shares=shares, conversion_price=fixed_price, method="fixed_price", principal=principal)

    # 3. SAFE / note: derive price from the round (discount and/or valuation cap).
    if round_price_per_share is None or round_price_per_share <= 0:
        raise ValueError("A round price per share is required to convert this instrument")
    if principal <= 0:
        raise ValueError("Instrument has no face value to convert")

    candidates: list[tuple[Decimal, str]] = [(round_price_per_share, "round_price")]

    discount = _d(terms.get("discount"))
    if discount is not None and 0 < discount < 1:
        candidates.append((round_price_per_share * (Decimal("1") - discount), "discount"))

    cap = _d(terms.get("valuation_cap"))
    if cap is not None and cap > 0:
        if pre_money_shares is None or pre_money_shares <= 0:
            raise ValueError("pre_money_shares is required to apply a valuation cap")
        candidates.append((cap / pre_money_shares, "valuation_cap"))

    conversion_price, method = min(candidates, key=lambda c: c[0])
    if conversion_price <= 0:
        raise ValueError("Computed conversion price is non-positive")

    shares = (principal / conversion_price).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return ConversionResult(shares=shares, conversion_price=conversion_price, method=method, principal=principal)
