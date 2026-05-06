"""Pydantic schemas for cap table events and holdings."""

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.cap_table_event import EventType


class IssueSharesRequest(BaseModel):
    stakeholder_id: uuid.UUID
    share_class: str = Field(default="ordinary", min_length=1, max_length=50)
    quantity: Decimal = Field(..., gt=0)
    event_date: date
    notes: str | None = None


class TransferSharesRequest(BaseModel):
    from_stakeholder_id: uuid.UUID
    to_stakeholder_id: uuid.UUID
    share_class: str = Field(default="ordinary", min_length=1, max_length=50)
    quantity: Decimal = Field(..., gt=0)
    event_date: date
    notes: str | None = None


class CapitalIncreaseRequest(BaseModel):
    new_authorized_capital: Decimal | None = Field(None, gt=0)
    new_paid_up_capital: Decimal | None = Field(None, gt=0)
    share_class: str = Field(default="ordinary", min_length=1, max_length=50)
    # Shares issued as part of the capital increase (may be 0 for pure authorized-only increase)
    shares_issued: Decimal = Field(default=Decimal("0"), ge=0)
    stakeholder_id: uuid.UUID | None = None  # who receives the new shares
    event_date: date
    notes: str | None = None


class CapitalDecreaseRequest(BaseModel):
    stakeholder_id: uuid.UUID
    share_class: str = Field(default="ordinary", min_length=1, max_length=50)
    quantity: Decimal = Field(..., gt=0)
    new_paid_up_capital: Decimal | None = Field(None, gt=0)
    event_date: date
    notes: str | None = None


class HoldingResponse(BaseModel):
    stakeholder_id: uuid.UUID
    stakeholder_name: str
    share_class: str
    quantity: Decimal
    percentage: Decimal  # 0–100, rounded to 4dp

    model_config = {"from_attributes": False}


class CapTableResponse(BaseModel):
    company_id: uuid.UUID
    total_shares: Decimal
    holdings: list[HoldingResponse]


class CapTableEventResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    event_type: EventType
    event_date: date
    payload: dict
    notes: str | None
    is_draft: bool
    created_by: uuid.UUID

    model_config = {"from_attributes": True}
