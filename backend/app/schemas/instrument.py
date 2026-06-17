"""Pydantic schemas for instrument endpoints."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

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


class ConvertInstrumentRequest(BaseModel):
    # Required for SAFE/note conversions; ignored when terms fix shares or price.
    round_price_per_share: Decimal | None = Field(None, gt=0)
    share_class: str = Field(default="preferred-a", min_length=1, max_length=50)
    accrued_amount: Decimal | None = Field(None, ge=0)  # profit/interest added to principal
    event_date: date
    notes: str | None = None
    preview: bool = False  # if true, compute without persisting


class ConversionResultResponse(BaseModel):
    instrument_id: uuid.UUID
    shares: Decimal
    conversion_price: Decimal | None
    method: str
    principal: Decimal
    share_class: str
    committed: bool


class AntiDilutionRequest(BaseModel):
    mechanism: Literal["broad_based_weighted_average", "full_ratchet"]
    old_conversion_price: Decimal = Field(..., gt=0)
    new_issue_price: Decimal = Field(..., gt=0)
    amount_invested: Decimal = Field(..., gt=0)
    # Required for broad-based weighted average:
    pre_round_fd_shares: Decimal | None = Field(None, gt=0)
    new_shares_issued: Decimal | None = Field(None, gt=0)


class AntiDilutionResponse(BaseModel):
    mechanism: str
    old_conversion_price: Decimal
    new_conversion_price: Decimal
    old_shares_on_conversion: Decimal
    new_shares_on_conversion: Decimal
    extra_shares: Decimal


class PhantomPayoutRequest(BaseModel):
    exit_price_per_share_sar: Decimal = Field(..., gt=0)
    # Withholding rate applied to the gross payout (0–1). Default 0 = no withholding.
    tax_rate: Decimal = Field(default=Decimal("0"), ge=0, le=1)


class PhantomPayoutResponse(BaseModel):
    instrument_id: uuid.UUID
    quantity: Decimal
    exit_price_per_share_sar: Decimal
    gross_payout_sar: Decimal
    tax_rate: Decimal
    tax_withheld_sar: Decimal
    net_payout_sar: Decimal
