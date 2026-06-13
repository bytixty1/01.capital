"""Sprint 1 remaining fields: IBAN on stakeholders, family_charter on companies,
custom_fields JSONB on stakeholders and holdings.

Revision ID: 0009_sprint1_remaining_fields
Revises: 0008_cap_table_events_created_by_on_delete_set_null
Create Date: 2026-06-13
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON

revision: str = "0009_sprint1_remaining_fields"
down_revision: str | None = "0008_cap_table_events_created_by_on_delete_set_null"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Stakeholder: add encrypted IBAN and custom_fields
    op.add_column("stakeholders", sa.Column("iban", sa.String(512), nullable=True))
    op.add_column("stakeholders", sa.Column("custom_fields", JSON, nullable=True))

    # Company: add family charter AoA flag
    op.add_column(
        "companies",
        sa.Column("has_family_charter", sa.Boolean(), nullable=False, server_default="false"),
    )

    # Holding: add custom_fields for restrictions and AoA-specific notes
    op.add_column("holdings", sa.Column("custom_fields", JSON, nullable=True))


def downgrade() -> None:
    op.drop_column("holdings", "custom_fields")
    op.drop_column("companies", "has_family_charter")
    op.drop_column("stakeholders", "custom_fields")
    op.drop_column("stakeholders", "iban")
