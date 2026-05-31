"""IFRS 2 share-based payment expense engine.

Computes the auditor-required share-based payment expense for equity-settled
ESOP grants per IFRS 2, the international accounting standard Saudi GAAP
adopts. Output: per-grant fair value (Black-Scholes) plus a straight-line
amortisation schedule over the vesting period.

v1 scope:
- Equity-settled option grants only (cash-settled / phantom not handled here)
- Black-Scholes call option pricing (Merton extension for continuous dividends)
- Straight-line amortisation across yearly periods
- Zero forfeiture assumption — auditor true-ups happen at period end externally

v1 NOT in scope:
- Forfeiture rate estimates and true-ups
- Modifications / repricing / cancellations
- Performance-condition vesting expense (graded vesting with market/non-market
  conditions requires per-tranche fair-value computation)
- Monthly or quarterly periods (yearly only, matching Saudi audit cadence)
"""

import math
import uuid
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from dateutil.relativedelta import relativedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.esop_grant import EsopGrant
from app.schemas.esop import (
    IFRS2ExpenseResponse,
    IFRS2PeriodExpense,
    IFRS2ValuationInputs,
)

SAR = Decimal("0.01")
ZERO = Decimal("0")


def _q(x: Decimal) -> Decimal:
    return x.quantize(SAR, rounding=ROUND_HALF_UP)


def _normal_cdf(x: float) -> float:
    """Standard normal cumulative distribution N(x), via erf."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def black_scholes_call(
    spot: Decimal,
    strike: Decimal,
    time_years: Decimal,
    volatility: Decimal,
    risk_free_rate: Decimal,
    dividend_yield: Decimal,
) -> Decimal:
    """Closed-form Black-Scholes-Merton call price.

    All inputs are Decimal for currency precision but the math runs in float
    because erf has no Decimal-native equivalent and the additional precision
    is irrelevant at audit granularity.
    """
    if time_years <= 0:
        # No time value left — option worth max(spot - strike, 0)
        intrinsic = max(spot - strike, ZERO)
        return intrinsic

    S = float(spot)
    K = float(strike)
    T = float(time_years)
    sigma = float(volatility)
    r = float(risk_free_rate)
    q = float(dividend_yield)

    if sigma <= 0 or S <= 0 or K <= 0:
        return ZERO

    sqrt_T = math.sqrt(T)
    d1 = (math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrt_T)
    d2 = d1 - sigma * sqrt_T

    call = S * math.exp(-q * T) * _normal_cdf(d1) - K * math.exp(-r * T) * _normal_cdf(d2)
    if call < 0:
        # Negative is meaningless — clamp to zero (can occur on extreme inputs)
        return ZERO

    return Decimal(str(call))


def _vesting_period_months(vesting_schedule: dict) -> int:
    """Return the total vesting months for the grant.

    Falls back to 48 months if not specified — same default as the create-grant
    endpoint.
    """
    return int(vesting_schedule.get("total_months", 48))


async def compute_grant_ifrs2_expense(
    db: AsyncSession,
    company_id: uuid.UUID,
    grant_id: uuid.UUID,
    inputs: IFRS2ValuationInputs,
) -> IFRS2ExpenseResponse:
    result = await db.execute(
        select(EsopGrant).where(
            EsopGrant.id == grant_id,
            EsopGrant.company_id == company_id,
        )
    )
    grant = result.scalar_one_or_none()
    if grant is None:
        raise ValueError("Grant not found")

    # 1. Strike — use the grant's exercise price; if missing, treat as 0 (full-value award).
    strike = grant.exercise_price if grant.exercise_price is not None else ZERO

    # 2. Time to expiry — caller may override; otherwise use vesting period as a
    #    reasonable proxy for expected option life (IFRS 2 §B17 allows expected
    #    life rather than full contractual life).
    total_months = _vesting_period_months(grant.vesting_schedule)
    if inputs.expected_life_years is not None:
        T_years = inputs.expected_life_years
    else:
        T_years = Decimal(total_months) / Decimal(12)

    # 3. Fair value per option via Black-Scholes
    fv_per_option = black_scholes_call(
        spot=inputs.spot_price_sar,
        strike=strike,
        time_years=T_years,
        volatility=inputs.volatility,
        risk_free_rate=inputs.risk_free_rate,
        dividend_yield=inputs.dividend_yield,
    )

    # 4. Total expense (zero-forfeiture assumption)
    total_expense = fv_per_option * grant.quantity

    # 5. Build yearly schedule over the vesting period (straight-line)
    vesting_start = grant.grant_date
    vesting_end = vesting_start + relativedelta(months=total_months)
    schedule: list[IFRS2PeriodExpense] = []

    if total_months == 0 or total_expense <= 0:
        return IFRS2ExpenseResponse(
            grant_id=grant.id,
            fair_value_per_option_sar=_q(fv_per_option),
            total_grant_expense_sar=_q(total_expense),
            vesting_start=vesting_start,
            vesting_end=vesting_end,
            total_vesting_months=total_months,
            inputs=inputs,
            schedule=[],
        )

    # Step yearly from vesting_start until we reach vesting_end. Last period
    # is the partial residual if vesting period doesn't divide evenly into years.
    cumulative = ZERO
    period_start = vesting_start
    while period_start < vesting_end:
        period_end = min(period_start + relativedelta(years=1), vesting_end)
        months_in_period = relativedelta(period_end, period_start)
        months = months_in_period.years * 12 + months_in_period.months
        # Fraction of total expense recognized this period
        fraction = Decimal(months) / Decimal(total_months)
        period_expense = total_expense * fraction
        cumulative += period_expense
        schedule.append(
            IFRS2PeriodExpense(
                period_start=period_start,
                period_end=period_end,
                period_expense_sar=_q(period_expense),
                cumulative_expense_sar=_q(cumulative),
            )
        )
        period_start = period_end

    # Force final cumulative to exactly match total_expense (absorb rounding drift)
    if schedule:
        diff = _q(total_expense) - schedule[-1].cumulative_expense_sar
        if diff != ZERO:
            last = schedule[-1]
            schedule[-1] = IFRS2PeriodExpense(
                period_start=last.period_start,
                period_end=last.period_end,
                period_expense_sar=last.period_expense_sar + diff,
                cumulative_expense_sar=last.cumulative_expense_sar + diff,
            )

    return IFRS2ExpenseResponse(
        grant_id=grant.id,
        fair_value_per_option_sar=_q(fv_per_option),
        total_grant_expense_sar=_q(total_expense),
        vesting_start=vesting_start,
        vesting_end=vesting_end,
        total_vesting_months=total_months,
        inputs=inputs,
        schedule=schedule,
    )
