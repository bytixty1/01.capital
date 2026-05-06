"""Pydantic schemas for instrument endpoints."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.instrument import InstrumentStatus, InstrumentType


class CreateInstrumentRequest(BaseModel):
    stakeholder_id: uuid.UUID
    instrument_type: InstrumentType
    name: str = Field(..., min_length=1, max_length=255)
    face_value: Decimal | None = Field(None, ge=0)
    quantity: Decimal = Field(..., gt=0)
    issue_date: date
    maturity_date: date | None = None
    terms: dict = Field(default_factory=dict)
    notes: str | None = None


class InstrumentResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    stakeholder_id: uuid.UUID
    instrument_type: InstrumentType
    name: str
    face_value: Decimal | None
    quantity: Decimal
    issue_date: date
    maturity_date: date | None
    terms: dict
    status: InstrumentStatus
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
