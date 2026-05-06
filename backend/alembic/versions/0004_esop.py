"""esop plans and grants

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-06 00:00:02.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "esop_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("total_pool", sa.Numeric(20, 4), nullable=False),
        sa.Column("allocated", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("share_class", sa.String(50), nullable=False, server_default="esop"),
        sa.Column("authorized_date", sa.Date(), nullable=True),
        sa.Column("plan_rules", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_esop_plans_company_id", "esop_plans", ["company_id"])

    op.create_table(
        "esop_grants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("esop_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stakeholder_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("stakeholders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quantity", sa.Numeric(20, 4), nullable=False),
        sa.Column("exercised_quantity", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column("grant_date", sa.Date(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("exercise_price", sa.Numeric(20, 4), nullable=True),
        sa.Column("vesting_schedule", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("termination_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_esop_grants_plan_id", "esop_grants", ["plan_id"])
    op.create_index("ix_esop_grants_company_id", "esop_grants", ["company_id"])


def downgrade() -> None:
    op.drop_table("esop_grants")
    op.drop_index("ix_esop_plans_company_id", table_name="esop_plans")
    op.drop_table("esop_plans")
