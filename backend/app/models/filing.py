"""Filing — tracks MoC/ZATCA/CMA compliance obligations triggered by cap table events.

Never auto-submits. Surfaces and structures only (per CLAUDE.md).
"""

import uuid
from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FilingType(str, Enum):
    MOC_PARTNER_REGISTER = "moc_partner_register"     # Update partner register at MoC
    MOC_AOA_AMENDMENT = "moc_aoa_amendment"           # AoA amendment filing
    MOC_CAPITAL_CHANGE = "moc_capital_change"          # Capital increase/decrease
    ZATCA_ZAKAT_YEAR = "zatca_zakat_year"              # Zakat-year structured data
    CMA_ESOP_DISCLOSURE = "cma_esop_disclosure"        # Quarterly ESOP disclosure


class FilingStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    NOT_REQUIRED = "not_required"


class Filing(Base):
    __tablename__ = "filings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filing_type: Mapped[str] = mapped_column(String(40), nullable=False)
    trigger_event_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cap_table_events.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=FilingStatus.PENDING)
    due_date: Mapped[date | None] = mapped_column(Date)
    submitted_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
