"""Pydantic schemas for ESOP endpoints."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.esop_grant import GrantStatus
from app.models.esop_plan import EsopPlanStatus


class CreateEsopPlanRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    total_pool: Decimal = Field(..., gt=0)
    share_class: str = Field(default="esop", min_length=1, max_length=50)
    authorized_date: date | None = None
    plan_rules: str | None = None


class EsopPlanResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    total_pool: Decimal
    allocated: Decimal
    share_class: str
    authorized_date: date | None
    plan_rules: str | None
    status: EsopPlanStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateGrantRequest(BaseModel):
    stakeholder_id: uuid.UUID
    quantity: Decimal = Field(..., gt=0)
    grant_date: date
    expiry_date: date | None = None
    exercise_price: Decimal | None = Field(None, ge=0)
    cliff_months: int = Field(default=12, ge=0, le=120)
    total_months: int = Field(default=48, ge=1, le=480)
    notes: str | None = None


class GrantResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    company_id: uuid.UUID
    stakeholder_id: uuid.UUID
    quantity: Decimal
    exercised_quantity: Decimal
    grant_date: date
    expiry_date: date | None
    exercise_price: Decimal | None
    vesting_schedule: dict
    status: GrantStatus
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class VestingStatusResponse(BaseModel):
    grant_id: uuid.UUID
    as_of_date: date
    total_granted: Decimal
    vested: Decimal
    exercised: Decimal
    exercisable: Decimal
    unvested: Decimal
    vesting_pct: Decimal


# ── IFRS 2 share-based payment expense ────────────────────────────────────────

class IFRS2ValuationInputs(BaseModel):
    """Inputs to the Black-Scholes model and the period schedule.

    All rates are decimals (0.05 = 5%), not percentages.
    """
    spot_price_sar: Decimal = Field(..., gt=0, description="Fair value per underlying share at grant date, in SAR")
    volatility: Decimal = Field(..., gt=0, le=2, description="Annualised volatility, e.g. 0.40 for 40%")
    risk_free_rate: Decimal = Field(..., ge=0, le=0.30, description="Annual risk-free rate, e.g. 0.045 for 4.5%")
    dividend_yield: Decimal = Field(default=Decimal("0"), ge=0, le=0.30, description="Annual dividend yield; usually 0 for startups")
    # Expected option life override (years). If null, derived from vesting period.
    expected_life_years: Decimal | None = Field(default=None, gt=0, le=20)


class IFRS2PeriodExpense(BaseModel):
    period_start: date
    period_end: date
    period_expense_sar: Decimal
    cumulative_expense_sar: Decimal


class IFRS2ExpenseResponse(BaseModel):
    grant_id: uuid.UUID
    fair_value_per_option_sar: Decimal   # Black-Scholes price
    total_grant_expense_sar: Decimal     # fair_value × quantity (assumes 0 forfeiture)
    vesting_start: date
    vesting_end: date
    total_vesting_months: int
    method: str = "black_scholes_straight_line"
    inputs: IFRS2ValuationInputs
    schedule: list[IFRS2PeriodExpense]
