"""Add "blocked" column to Users

Revision ID: f162955602a8
Revises: b85f02ec1308
Create Date: 2024-06-12 10:45:28.443844

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f162955602a8"
down_revision = "b85f02ec1308"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("blocked", sa.BOOLEAN(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("user", "blocked")
