"""Pydantic schemas for stakeholder endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.stakeholder import StakeholderType


class CreateStakeholderRequest(BaseModel):
    stakeholder_type: StakeholderType
    name_en: str = Field(..., min_length=1, max_length=255)
    name_ar: str | None = None
    national_id: str | None = None  # AES-GCM encrypted at rest; never logged
    iban: str | None = None         # AES-GCM encrypted at rest; never logged
    nationality: str | None = Field(None, min_length=3, max_length=3)  # ISO 3166-1 alpha-3
    cr_number: str | None = None
    email: str | None = None
    custom_fields: dict | None = None


class UpdateStakeholderRequest(BaseModel):
    name_en: str | None = Field(None, min_length=1, max_length=255)
    name_ar: str | None = None
    national_id: str | None = None  # AES-GCM encrypted at rest; never logged
    iban: str | None = None         # AES-GCM encrypted at rest; never logged
    nationality: str | None = Field(None, min_length=3, max_length=3)
    cr_number: str | None = None
    email: str | None = None
    custom_fields: dict | None = None


class StakeholderResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    stakeholder_type: StakeholderType
    name_en: str
    name_ar: str | None
    nationality: str | None
    cr_number: str | None
    email: str | None
    custom_fields: dict | None
    created_at: datetime
    # national_id and iban are intentionally omitted — PII, encrypted at rest

    model_config = {"from_attributes": True}
