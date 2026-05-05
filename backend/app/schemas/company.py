"""Pydantic schemas for company endpoints."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

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
    created_at: datetime

    model_config = {"from_attributes": True}
