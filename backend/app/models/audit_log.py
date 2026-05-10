"""AuditLog — immutable record of security-relevant events.

Covers: logins, failed logins, MFA events, cap table views, exports,
admin actions. Never UPDATE or DELETE rows — append only.
"""

import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditAction(str, Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGIN_MFA_FAILED = "login_mfa_failed"
    LOGOUT = "logout"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    CAP_TABLE_VIEWED = "cap_table_viewed"
    CAP_TABLE_EXPORTED = "cap_table_exported"
    DOCUMENT_EXPORTED = "document_exported"
    MEMBER_ROLE_CHANGED = "member_role_changed"
    MEMBER_REMOVED = "member_removed"
    STAKEHOLDER_CREATED = "stakeholder_created"
    COMPANY_CREATED = "company_created"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45))  # supports IPv6
    user_agent: Mapped[str | None] = mapped_column(Text)
    detail: Mapped[str | None] = mapped_column(Text)  # non-PII context only

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
