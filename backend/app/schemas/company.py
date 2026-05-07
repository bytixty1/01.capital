"""Pydantic schemas for company endpoints."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.models.company import CompanyStatus, EntityType


class CreateCompanyRequest(BaseModel):
    name_en: str = Field(..., min_length=1, max_length=255)
    name_ar: str | None = None
    entity_type: EntityType
    cr_number: str | None = None
    authorized_capital: Decimal | None = Field(None, ge=0)
    paid_up_capital: Decimal | None = Field(None, ge=0)
    par_value_per_share: Decimal | None = Field(None, gt=0)
    incorporation_date: date | None = None
    fiscal_year_start: int | None = Field(None, ge=1, le=12)
    # AoA governance flags
    has_rofr: bool = False
    rofr_days: int | None = Field(None, ge=1, le=365)
    has_drag_tag: bool = False
    has_tag_along: bool = False
    profit_allocation_notes: str | None = None

    @model_validator(mode="before")
    @classmethod
    def empty_strings_to_none(cls, values: dict) -> dict:
        for k, v in values.items():
            if v == "":
                values[k] = None
        return values


class UpdateCompanyRequest(BaseModel):
    name_en: str | None = Field(None, min_length=1, max_length=255)
    name_ar: str | None = None
    cr_number: str | None = None
    authorized_capital: Decimal | None = Field(None, ge=0)
    paid_up_capital: Decimal | None = Field(None, ge=0)
    par_value_per_share: Decimal | None = Field(None, gt=0)
    incorporation_date: date | None = None
    fiscal_year_start: int | None = Field(None, ge=1, le=12)
    status: CompanyStatus | None = None
    has_rofr: bool | None = None
    rofr_days: int | None = Field(None, ge=1, le=365)
    has_drag_tag: bool | None = None
    has_tag_along: bool | None = None
    profit_allocation_notes: str | None = None


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name_en: str
    name_ar: str | None
    entity_type: EntityType
    cr_number: str | None
    status: CompanyStatus
    authorized_capital: Decimal | None
    paid_up_capital: Decimal | None
    par_value_per_share: Decimal | None
    incorporation_date: date | None
    fiscal_year_start: int | None
    has_rofr: bool
    rofr_days: int | None
    has_drag_tag: bool
    has_tag_along: bool
    profit_allocation_notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
