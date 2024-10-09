"""add api_version and deployment_name to search settings

Revision ID: 5d12a446f5c0
Revises: ac5eaac849f9
Create Date: 2024-10-08 15:56:07.975636

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5d12a446f5c0"
down_revision = "ac5eaac849f9"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "embedding_provider", sa.Column("api_version", sa.String(), nullable=True)
    )
    op.add_column(
        "embedding_provider", sa.Column("deployment_name", sa.String(), nullable=True)
    )


def downgrade():
    op.drop_column("embedding_provider", "deployment_name")
    op.drop_column("embedding_provider", "api_version")
