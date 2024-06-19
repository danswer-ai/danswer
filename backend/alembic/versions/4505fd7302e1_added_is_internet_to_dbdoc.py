"""added is_internet to DBDoc

Revision ID: 4505fd7302e1
Revises: 48d14957fe80
Create Date: 2024-06-18 20:46:09.095034

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "4505fd7302e1"
down_revision = "48d14957fe80"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "search_doc", sa.Column("is_internet", sa.Boolean(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("search_doc", "is_internet")
