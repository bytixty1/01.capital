"""cap_table_events created_by on delete set null

Revision ID: 0008
Revises: 634ce2c948ef
Create Date: 2026-05-17

Allow users to be deleted even if they created cap table events.
The audit record is preserved; created_by becomes NULL.
"""

from alembic import op

revision = "0008"
down_revision = ("0007", "634ce2c948ef")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "cap_table_events_created_by_fkey",
        "cap_table_events",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "cap_table_events_created_by_fkey",
        "cap_table_events",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )
    # created_by must be nullable now that it can be set to NULL
    op.alter_column("cap_table_events", "created_by", nullable=True)


def downgrade() -> None:
    op.alter_column("cap_table_events", "created_by", nullable=False)
    op.drop_constraint(
        "cap_table_events_created_by_fkey",
        "cap_table_events",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "cap_table_events_created_by_fkey",
        "cap_table_events",
        "users",
        ["created_by"],
        ["id"],
    )
