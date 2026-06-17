"""pro-rata rights table

Revision ID: 0012_pro_rata_rights
Revises: 0011_signing_records
Create Date: 2026-06-17 00:00:00.000000

Note: chains off the real head (0011_signing_records). The original task brief
asked for revision="0006"/down_revision="0005", but revision "0006" already
exists (0006_mfa_and_audit_log) and 0005 is no longer a head, so those values
would produce a duplicate revision id and a branched chain.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012_pro_rata_rights"
down_revision: Union[str, None] = "0011_signing_records"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pro_rata_rights",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "stakeholder_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("stakeholders.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "instrument_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("instruments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("round_name", sa.String(255), nullable=False),
        sa.Column("max_investment_sar", sa.Numeric(20, 2), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("exercised_amount_sar", sa.Numeric(20, 2), nullable=True),
        sa.Column("exercised_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_pro_rata_rights_company_id", "pro_rata_rights", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_pro_rata_rights_company_id", table_name="pro_rata_rights")
    op.drop_table("pro_rata_rights")
