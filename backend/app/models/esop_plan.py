"""EsopPlan — a pool of shares set aside for employee equity grants."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EsopPlanStatus(str, Enum):
    ACTIVE = "active"
    EXHAUSTED = "exhausted"
    CLOSED = "closed"


class EsopPlan(Base):
    __tablename__ = "esop_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    total_pool: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False)
    allocated: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False, default=Decimal("0"))
    share_class: Mapped[str] = mapped_column(String(50), nullable=False, default="esop")
    authorized_date: Mapped[date | None] = mapped_column(Date)
    plan_rules: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=EsopPlanStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    grants: Mapped[list["EsopGrant"]] = relationship(back_populates="plan", cascade="all, delete-orphan")  # noqa: F821
