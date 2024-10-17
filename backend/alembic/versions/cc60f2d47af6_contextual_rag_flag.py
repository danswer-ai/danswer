"""contextual rag flag

Revision ID: cc60f2d47af6
Revises: 46b7a812670f
Create Date: 2024-10-14 00:01:18.344442

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "cc60f2d47af6"
down_revision = "e4334d5b33ba"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "search_settings",
        sa.Column(
            "enable_contextual_rag",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("search_settings", "enable_contextual_rag")
