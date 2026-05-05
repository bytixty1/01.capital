"""Holding — materialized current share position for a stakeholder.

Derived by projecting cap_table_events. Kept in sync by the cap table service
after each event write. Do not write to this table directly from API handlers.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (
        UniqueConstraint("company_id", "stakeholder_id", "share_class", name="uq_holding"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stakeholder_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("stakeholders.id", ondelete="CASCADE"), nullable=False
    )
    share_class: Mapped[str] = mapped_column(
        String(50), nullable=False, default="ordinary"
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    company: Mapped["Company"] = relationship(back_populates="holdings")  # noqa: F821
    stakeholder: Mapped["Stakeholder"] = relationship(back_populates="holdings")  # noqa: F821
