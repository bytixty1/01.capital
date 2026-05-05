"""CompanyMember — links a User to a Company with a role.

Implements ADR-0005: one company = one tenant; users may belong to many companies.
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MemberRole(str, Enum):
    ADMIN = "admin"    # Full control — create events, add stakeholders, export
    EDITOR = "editor"  # Can edit draft events, add stakeholders
    VIEWER = "viewer"  # Read-only cap table access


class CompanyMember(Base):
    __tablename__ = "company_members"
    __table_args__ = (UniqueConstraint("company_id", "user_id", name="uq_company_member"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=MemberRole.ADMIN)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    company: Mapped["Company"] = relationship(back_populates="members")  # noqa: F821
    user: Mapped["User"] = relationship()  # noqa: F821
