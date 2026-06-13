"""Company — the primary tenant boundary.

Each company maps to one tenant. Entity types follow Saudi Companies Law 2023
(LLC = ذات مسؤولية محدودة, SJSC = مساهمة مبسطة, JSC = مساهمة).
"""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EntityType(str, Enum):
    LLC = "LLC"    # ذات مسؤولية محدودة — most common for startups
    SJSC = "SJSC"  # مساهمة مبسطة — simplified joint stock, Saudi Companies Law 2023
    JSC = "JSC"    # مساهمة — full joint stock


class CompanyStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DISSOLVED = "dissolved"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_ar: Mapped[str | None] = mapped_column(String(255))
    entity_type: Mapped[str] = mapped_column(String(10), nullable=False)  # EntityType
    cr_number: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=CompanyStatus.ACTIVE
    )

    # Capital — stored in SAR, exact decimal
    authorized_capital: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    paid_up_capital: Mapped[Decimal | None] = mapped_column(Numeric(20, 2))
    par_value_per_share: Mapped[Decimal | None] = mapped_column(Numeric(20, 4))

    incorporation_date: Mapped[date | None] = mapped_column(Date)
    fiscal_year_start: Mapped[int | None] = mapped_column()  # month 1-12

    # AoA governance flags (Saudi Companies Law 2023, Articles 168–210)
    has_rofr: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rofr_days: Mapped[int | None] = mapped_column()  # pre-emption window in days
    has_drag_tag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_tag_along: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_family_charter: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    profit_allocation_notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    members: Mapped[list["CompanyMember"]] = relationship(  # noqa: F821
        back_populates="company", cascade="all, delete-orphan"
    )
    stakeholders: Mapped[list["Stakeholder"]] = relationship(  # noqa: F821
        back_populates="company", cascade="all, delete-orphan"
    )
    cap_table_events: Mapped[list["CapTableEvent"]] = relationship(  # noqa: F821
        back_populates="company", cascade="all, delete-orphan"
    )
    holdings: Mapped[list["Holding"]] = relationship(  # noqa: F821
        back_populates="company", cascade="all, delete-orphan"
    )
