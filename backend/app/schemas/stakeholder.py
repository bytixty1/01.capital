"""Pydantic schemas for stakeholder endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.stakeholder import StakeholderType


class CreateStakeholderRequest(BaseModel):
    stakeholder_type: StakeholderType
    name_en: str = Field(..., min_length=1, max_length=255)
    name_ar: str | None = None
    national_id: str | None = None  # never logged — see CLAUDE.md security rules
    nationality: str | None = Field(None, min_length=3, max_length=3)  # ISO 3166-1 alpha-3
    cr_number: str | None = None
    email: str | None = None


class StakeholderResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    stakeholder_type: StakeholderType
    name_en: str
    name_ar: str | None
    nationality: str | None
    cr_number: str | None
    email: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
