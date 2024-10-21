"""hybrid-enum

Revision ID: 5fc1f54cc252
Revises: 1d6ad76d1f37
Create Date: 2024-08-06 15:35:40.278485

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "5fc1f54cc252"
down_revision = "1d6ad76d1f37"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.drop_column("assistant", "search_type")


def downgrade() -> None:
    op.add_column("assistant", sa.Column("search_type", sa.String(), nullable=True))
    op.execute("UPDATE assistant SET search_type = 'SEMANTIC'")
    op.alter_column("assistant", "search_type", nullable=False)
