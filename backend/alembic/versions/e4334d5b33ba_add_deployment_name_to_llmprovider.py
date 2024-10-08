"""add_deployment_name_to_llmprovider

Revision ID: e4334d5b33ba
Revises: 46b7a812670f
Create Date: 2024-10-04 09:52:34.896867

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e4334d5b33ba"
down_revision = "46b7a812670f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "llm_provider", sa.Column("deployment_name", sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("llm_provider", "deployment_name")
