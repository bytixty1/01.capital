"""Pydantic schemas for filing tracker endpoints."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel

from app.models.filing import FilingStatus, FilingType


class FilingResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    filing_type: FilingType
    trigger_event_id: uuid.UUID | None
    status: FilingStatus
    due_date: date | None
    submitted_date: date | None
    notes: str | None
    created_at: datetime
    # Computed/enriched fields (set by the endpoint, not stored).
    is_overdue: bool = False
    reference: dict | None = None

    model_config = {"from_attributes": True}


class UpdateFilingRequest(BaseModel):
    status: FilingStatus | None = None
    submitted_date: date | None = None
    notes: str | None = None
