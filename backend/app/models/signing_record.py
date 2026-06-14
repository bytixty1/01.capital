"""SigningRecord — audit-traceable record of a document sent for e-signature.

Vendor-neutral: the record stores which adapter handled it and the provider's
envelope reference. V1 uses a stub adapter (no external calls); a real provider
(DocuSign or a Saudi-local e-sign service) slots in behind the same interface
without schema changes. Append-mostly: status transitions are the only updates.
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SigningStatus(str, Enum):
    SENT = "sent"
    SIGNED = "signed"
    DECLINED = "declined"
    VOIDED = "voided"


class SigningRecord(Base):
    __tablename__ = "signing_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # What kind of document this envelope covers (free-form, e.g. "cap_table",
    # "share_certificate", "board_resolution", "grant_offer").
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)

    provider: Mapped[str] = mapped_column(String(40), nullable=False)  # adapter name, e.g. "stub"
    envelope_id: Mapped[str] = mapped_column(String(120), nullable=False)  # provider's reference

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=SigningStatus.SENT)
    # [{ "name": ..., "email": ... }, ...] — no PII beyond what the signer provides
    signers: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    notes: Mapped[str | None] = mapped_column(Text)

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
