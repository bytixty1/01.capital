"""Pydantic schemas for pro-rata rights endpoints."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.pro_rata_right import ProRataStatus


class ProRataRightCreate(BaseModel):
    stakeholder_id: uuid.UUID
    instrument_id: uuid.UUID | None = None
    round_name: str = Field(..., min_length=1, max_length=255)
    max_investment_sar: Decimal = Field(..., gt=0)
    deadline: date | None = None
    notes: str | None = None


class ProRataExercise(BaseModel):
    exercised_amount_sar: Decimal = Field(..., gt=0)


class ProRataRightResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    stakeholder_id: uuid.UUID
    instrument_id: uuid.UUID | None
    round_name: str
    max_investment_sar: Decimal
    deadline: date | None
    status: ProRataStatus
    exercised_amount_sar: Decimal | None
    exercised_at: datetime | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
