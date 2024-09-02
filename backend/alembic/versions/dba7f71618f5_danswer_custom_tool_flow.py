"""Danswer Custom Tool Flow

Revision ID: dba7f71618f5
Revises: d5645c915d0e
Create Date: 2023-09-18 15:18:37.370972

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "dba7f71618f5"
down_revision = "d5645c915d0e"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.add_column(
        "assistant",
        sa.Column("retrieval_enabled", sa.Boolean(), nullable=True),
    )
    op.execute("UPDATE assistant SET retrieval_enabled = true")
    op.alter_column("assistant", "retrieval_enabled", nullable=False)


def downgrade() -> None:
    op.drop_column("assistant", "retrieval_enabled")
