"""Security hardening: real email OTP, expand encrypted columns

Revision ID: 0007
Revises: 0006
Create Date: 2026-05-14

- Add verification_otp_hash + verification_otp_expires_at to users
- Expand users.mfa_secret from String(64) → String(512) for AES-GCM ciphertext
- Expand stakeholders.national_id from String(20) → String(512) for AES-GCM ciphertext
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("verification_otp_hash", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("verification_otp_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column("users", "mfa_secret", type_=sa.String(512), existing_nullable=True)
    op.alter_column("stakeholders", "national_id", type_=sa.String(512), existing_nullable=True)


def downgrade() -> None:
    op.alter_column("stakeholders", "national_id", type_=sa.String(20), existing_nullable=True)
    op.alter_column("users", "mfa_secret", type_=sa.String(64), existing_nullable=True)
    op.drop_column("users", "verification_otp_expires_at")
    op.drop_column("users", "verification_otp_hash")
