"""add AoA governance flags to companies

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-06 00:00:01.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("has_rofr", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("companies", sa.Column("rofr_days", sa.Integer(), nullable=True))
    op.add_column("companies", sa.Column("has_drag_tag", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("companies", sa.Column("has_tag_along", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("companies", sa.Column("profit_allocation_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "profit_allocation_notes")
    op.drop_column("companies", "has_tag_along")
    op.drop_column("companies", "has_drag_tag")
    op.drop_column("companies", "rofr_days")
    op.drop_column("companies", "has_rofr")
