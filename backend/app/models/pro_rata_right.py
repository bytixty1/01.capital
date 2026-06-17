"""ProRataRight — pre-emptive investment rights tracking.

Saudi Companies Law (2023) Art. 142 grants existing shareholders a pre-emptive
right to subscribe to new shares in proportion to their holdings. This records
each granted right, its ceiling, and whether it was exercised, waived, or lapsed.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ProRataStatus(str, Enum):
    ACTIVE = "active"
    EXERCISED = "exercised"
    WAIVED = "waived"
    EXPIRED = "expired"


class ProRataRight(Base):
    __tablename__ = "pro_rata_rights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stakeholder_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stakeholders.id", ondelete="CASCADE"), nullable=False
    )
    instrument_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("instruments.id", ondelete="SET NULL"), nullable=True
    )
    round_name: Mapped[str] = mapped_column(String(255), nullable=False)
    max_investment_sar: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    deadline: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=ProRataStatus.ACTIVE)
    exercised_amount_sar: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    exercised_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
