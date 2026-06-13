"""Sprint 3: leaver_type on esop_grants for good/bad leaver termination handling.

Revision ID: 0010_esop_leaver_type
Revises: 0009_sprint1_remaining_fields
Create Date: 2026-06-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010_esop_leaver_type"
down_revision: str | None = "0009_sprint1_remaining_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 'good_leaver' | 'bad_leaver' | NULL (not terminated)
    op.add_column("esop_grants", sa.Column("leaver_type", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("esop_grants", "leaver_type")
