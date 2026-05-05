"""domain tables: companies, members, stakeholders, events, holdings

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-06 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name_en", sa.String(255), nullable=False),
        sa.Column("name_ar", sa.String(255), nullable=True),
        sa.Column("entity_type", sa.String(10), nullable=False),
        sa.Column("cr_number", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("authorized_capital", sa.Numeric(20, 2), nullable=True),
        sa.Column("paid_up_capital", sa.Numeric(20, 2), nullable=True),
        sa.Column("par_value_per_share", sa.Numeric(20, 4), nullable=True),
        sa.Column("incorporation_date", sa.Date(), nullable=True),
        sa.Column("fiscal_year_start", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_companies_cr_number", "companies", ["cr_number"], unique=True)

    op.create_table(
        "company_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False, server_default="admin"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("company_id", "user_id", name="uq_company_member"),
    )
    op.create_index("ix_company_members_company_id", "company_members", ["company_id"])
    op.create_index("ix_company_members_user_id", "company_members", ["user_id"])

    op.create_table(
        "stakeholders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stakeholder_type", sa.String(20), nullable=False),
        sa.Column("name_en", sa.String(255), nullable=False),
        sa.Column("name_ar", sa.String(255), nullable=True),
        sa.Column("national_id", sa.String(20), nullable=True),
        sa.Column("nationality", sa.String(3), nullable=True),
        sa.Column("cr_number", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_stakeholders_company_id", "stakeholders", ["company_id"])

    op.create_table(
        "cap_table_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_draft", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_cap_table_events_company_id", "cap_table_events", ["company_id"])

    op.create_table(
        "holdings",
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
        sa.Column("share_class", sa.String(50), nullable=False, server_default="ordinary"),
        sa.Column("quantity", sa.Numeric(20, 4), nullable=False, server_default="0"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("company_id", "stakeholder_id", "share_class", name="uq_holding"),
    )
    op.create_index("ix_holdings_company_id", "holdings", ["company_id"])


def downgrade() -> None:
    op.drop_table("holdings")
    op.drop_table("cap_table_events")
    op.drop_table("stakeholders")
    op.drop_index("ix_company_members_user_id", table_name="company_members")
    op.drop_index("ix_company_members_company_id", table_name="company_members")
    op.drop_table("company_members")
    op.drop_index("ix_companies_cr_number", table_name="companies")
    op.drop_table("companies")
