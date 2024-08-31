"""Add tool table

Revision ID: 3879338f8ba1
Revises: f1c6478c3fd8
Create Date: 2024-05-11 16:11:23.718084

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "3879338f8ba1"
down_revision = "f1c6478c3fd8"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.create_table(
        "tool",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("in_code_tool_id", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "assistant__tool",
        sa.Column("assistant_id", sa.Integer(), nullable=False),
        sa.Column("tool_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["assistant_id"],
            ["assistant.id"],
        ),
        sa.ForeignKeyConstraint(
            ["tool_id"],
            ["tool.id"],
        ),
        sa.PrimaryKeyConstraint("assistant_id", "tool_id"),
    )


def downgrade() -> None:
    op.drop_table("assistant__tool")
    op.drop_table("tool")
