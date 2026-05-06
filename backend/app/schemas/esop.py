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
