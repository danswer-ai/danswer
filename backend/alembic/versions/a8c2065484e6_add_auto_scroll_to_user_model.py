"""add auto scroll to user model

Revision ID: a8c2065484e6
Revises: 177de57c21c9
Create Date: 2024-11-22 17:34:09.690295

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a8c2065484e6"
down_revision = "177de57c21c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add the auto_scroll column with a default value of True
    op.add_column(
        "user",
        sa.Column("auto_scroll", sa.Boolean(), nullable=True, server_default=None),
    )


def downgrade() -> None:
    # Remove the auto_scroll column
    op.drop_column("user", "auto_scroll")
