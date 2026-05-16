"""Pydantic schemas for cap table events and holdings."""

import uuid
from datetime import date
from decimal import Decimal
from typing import Literal

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
    stakeholder_id: uuid.UUID | None  # None for synthetic (diluted) rows
    stakeholder_name: str
    share_class: str
    quantity: Decimal
    percentage: Decimal  # 0–100, rounded to 4dp
    # Diluted-view markers — None for real holdings, set for synthetic rows
    synthetic: Literal["esop_pool", "esop_grants", "convertible"] | None = None

    model_config = {"from_attributes": False}


class CapTableResponse(BaseModel):
    company_id: uuid.UUID
    total_shares: Decimal  # back-compat: matches the active view (issued OR diluted)
    holdings: list[HoldingResponse]
    # Optional dual-totals so the frontend can display "Issued 1,000,000 · Diluted 1,250,000"
    total_shares_issued: Decimal | None = None
    total_shares_diluted: Decimal | None = None


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


# ── Pro forma round modeler ──────────────────────────────────────────────────

class RoundPreviewRequest(BaseModel):
    round_size_sar: Decimal = Field(..., gt=0, description="Total amount raised, in SAR")
    price_per_share: Decimal = Field(..., gt=0, description="SAR per share")
    new_share_class: str = Field(default="preferred-a", min_length=1, max_length=50)
    new_investor_name: str = Field(default="New Round Investors", min_length=1, max_length=200)
    target_esop_post_money_pct: Decimal | None = Field(
        default=None, ge=0, le=50,
        description="Optional: top up ESOP pool to this % of post-money cap table",
    )


class ProjectedHolding(BaseModel):
    stakeholder_name: str
    share_class: str
    pre_round_quantity: Decimal
    pre_round_percentage: Decimal      # 0–100
    post_round_quantity: Decimal
    post_round_percentage: Decimal     # 0–100
    dilution_delta_pp: Decimal         # post − pre, in percentage points (signed)
    is_new: bool = False
    synthetic: Literal["esop_pool", "esop_grants", "convertible", "esop_topup", "new_investor"] | None = None


class RoundPreviewResponse(BaseModel):
    pre_money_valuation_sar: Decimal
    post_money_valuation_sar: Decimal
    pre_round_total_shares: Decimal      # fully diluted
    post_round_total_shares: Decimal     # fully diluted, with ESOP top-up + new investor shares
    new_investor_shares: Decimal
    esop_topup_shares: Decimal           # 0 if not requested
    holdings: list[ProjectedHolding]
