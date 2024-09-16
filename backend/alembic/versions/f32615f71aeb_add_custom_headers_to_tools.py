"""add custom headers to tools

Revision ID: f32615f71aeb
Revises: 5c7fdadae813
Create Date: 2024-09-12 20:26:38.932377

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "f32615f71aeb"
down_revision = "5c7fdadae813"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tool", sa.Column("custom_headers", postgresql.JSONB(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("tool", "custom_headers")
