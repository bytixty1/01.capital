"""CapTableEvent — immutable audit log of all cap table state changes.

Implements ADR-0003: append-only event sourcing. Never UPDATE or DELETE rows.
Current state is derived by projecting events into the holdings table.
"""

import uuid
from datetime import date, datetime
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EventType(str, Enum):
    SHARE_ISSUANCE = "share_issuance"
    SHARE_TRANSFER = "share_transfer"
    SHARE_CANCELLATION = "share_cancellation"
    CAPITAL_INCREASE = "capital_increase"
    CAPITAL_DECREASE = "capital_decrease"
    SHARE_SPLIT = "share_split"
    OPTION_EXERCISE = "option_exercise"


class CapTableEvent(Base):
    __tablename__ = "cap_table_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)

    # JSONB payload — structure depends on event_type
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    notes: Mapped[str | None] = mapped_column(Text)

    # All generated documents start as DRAFT — reviewed with legal counsel before use
    is_draft: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company: Mapped["Company"] = relationship(back_populates="cap_table_events")  # noqa: F821
