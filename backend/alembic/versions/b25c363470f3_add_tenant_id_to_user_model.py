"""add tenant id to user model

Revision ID: b25c363470f3
Revises: 1f60f60c3401
Create Date: 2024-08-29 17:03:20.794120

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b25c363470f3"
down_revision = "1f60f60c3401"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("tenant_id", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "tenant_id")
