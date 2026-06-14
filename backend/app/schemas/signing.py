"""Pydantic schemas for the e-signing adapter endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.signing_record import SigningStatus


class SignerInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr


class CreateSigningRequest(BaseModel):
    document_type: str = Field(..., min_length=1, max_length=50)
    document_name: str = Field(..., min_length=1, max_length=255)
    signers: list[SignerInput] = Field(..., min_length=1, max_length=20)
    notes: str | None = None


class SigningRecordResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    document_type: str
    document_name: str
    provider: str
    envelope_id: str
    status: SigningStatus
    signers: list
    notes: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}
