"""Pydantic schemas for ESOP endpoints."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.models.esop_grant import GrantStatus, LeaverType
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


class PerformanceMilestone(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    fraction: Decimal = Field(..., gt=0, le=1, description="Portion of grant that vests on achievement (0–1)")
    achieved: bool = False
    achieved_date: date | None = None


class CreateGrantRequest(BaseModel):
    stakeholder_id: uuid.UUID
    quantity: Decimal = Field(..., gt=0)
    grant_date: date
    expiry_date: date | None = None
    exercise_price: Decimal | None = Field(None, ge=0)
    # Vesting: time-based (cliff_monthly) or performance/milestone-based
    vesting_type: Literal["cliff_monthly", "performance"] = "cliff_monthly"
    cliff_months: int = Field(default=12, ge=0, le=120)
    total_months: int = Field(default=48, ge=1, le=480)
    milestones: list[PerformanceMilestone] | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def _validate_vesting(self) -> "CreateGrantRequest":
        if self.vesting_type == "performance":
            if not self.milestones:
                raise ValueError("performance vesting requires at least one milestone")
            total = sum((m.fraction for m in self.milestones), Decimal("0"))
            if total > Decimal("1"):
                raise ValueError(f"milestone fractions sum to {total}, must not exceed 1.0")
        return self


class ExerciseGrantRequest(BaseModel):
    quantity: Decimal = Field(..., gt=0)
    exercise_type: Literal["cash", "net"] = "cash"
    exercise_date: date
    notes: str | None = None


class TerminateGrantRequest(BaseModel):
    leaver_type: LeaverType
    termination_date: date
    notes: str | None = None


class AchieveMilestoneRequest(BaseModel):
    milestone_index: int = Field(..., ge=0)
    achieved_date: date


class BulkGrantRow(BaseModel):
    stakeholder_id: uuid.UUID
    quantity: Decimal = Field(..., gt=0)
    grant_date: date
    exercise_price: Decimal | None = Field(None, ge=0)
    cliff_months: int = Field(default=12, ge=0, le=120)
    total_months: int = Field(default=48, ge=1, le=480)


class BulkGrantRequest(BaseModel):
    dry_run: bool = True  # preview by default; client confirms before committing
    grants: list[BulkGrantRow] = Field(..., min_length=1, max_length=500)


class BulkGrantRowResult(BaseModel):
    stakeholder_id: uuid.UUID
    quantity: Decimal
    ok: bool
    error: str | None = None


class BulkGrantResponse(BaseModel):
    dry_run: bool
    total_rows: int
    valid_rows: int
    total_quantity: Decimal
    pool_remaining_after: Decimal
    committed: int
    results: list[BulkGrantRowResult]


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
    termination_date: date | None = None
    leaver_type: LeaverType | None = None
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
