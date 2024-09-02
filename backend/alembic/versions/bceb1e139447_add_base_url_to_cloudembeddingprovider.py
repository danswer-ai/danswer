"""Add base_url to CloudEmbeddingProvider

Revision ID: bceb1e139447
Revises: 1f60f60c3401
Create Date: 2024-08-28 17:00:52.554580

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "bceb1e139447"
down_revision = "1f60f60c3401"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "embedding_provider", sa.Column("api_url", sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("embedding_provider", "api_url")
