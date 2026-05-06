"""Instrument — sophisticated equity instruments (sukuk-convertible, phantom shares).

These sit alongside the main cap table as contingent obligations.
They appear in the fully-diluted view but not in the basic ownership view.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class InstrumentType(str, Enum):
    SUKUK_CONVERTIBLE = "sukuk_convertible"
    PHANTOM = "phantom"
    WARRANT = "warrant"


class InstrumentStatus(str, Enum):
    ACTIVE = "active"
    CONVERTED = "converted"
    REDEEMED = "redeemed"
    EXPIRED = "expired"


class Instrument(Base):
    __tablename__ = "instruments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stakeholder_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stakeholders.id", ondelete="CASCADE"), nullable=False
    )
    instrument_type: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    face_value: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))  # SAR
    # For sukuk: notional amount; for phantom: reference share count
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    maturity_date: Mapped[date | None] = mapped_column(Date)
    # Instrument-specific terms as JSONB
    # Sukuk: { "conversion_price": "10.00", "conversion_shares": "1000", "profit_rate": "0.05" }
    # Phantom: { "reference_share_class": "ordinary", "settlement": "cash" }
    terms: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=InstrumentStatus.ACTIVE)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
