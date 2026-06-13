"""Stakeholder — a person or entity that holds (or may hold) shares in a company.

Stakeholders are scoped to a company (one tenant). Natural person national IDs
are never logged per CLAUDE.md security rules.
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StakeholderType(str, Enum):
    NATURAL_PERSON = "natural_person"
    LEGAL_ENTITY = "legal_entity"


class Stakeholder(Base):
    __tablename__ = "stakeholders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stakeholder_type: Mapped[str] = mapped_column(String(20), nullable=False)

    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str | None] = mapped_column(String(255))

    # Natural persons: national_id and iban stored AES-GCM encrypted (plain value never logged)
    national_id: Mapped[str | None] = mapped_column(String(512))
    iban: Mapped[str | None] = mapped_column(String(512))  # AES-GCM encrypted; used for exercise payouts
    nationality: Mapped[str | None] = mapped_column(String(3))  # ISO 3166-1 alpha-3

    # Legal entities: CR number
    cr_number: Mapped[str | None] = mapped_column(String(20))

    email: Mapped[str | None] = mapped_column(String(255))

    # Flexible attributes for AoA-specific or onboarding fields not in core schema
    custom_fields: Mapped[dict | None] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    company: Mapped["Company"] = relationship(back_populates="stakeholders")  # noqa: F821
    holdings: Mapped[list["Holding"]] = relationship(  # noqa: F821
        back_populates="stakeholder", cascade="all, delete-orphan"
    )
