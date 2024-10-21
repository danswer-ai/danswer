"""non nullable default assistant

Revision ID: bd2921608c3a
Revises: 797089dfb4d2
Create Date: 2024-09-20 10:28:37.992042

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "bd2921608c3a"
down_revision = "797089dfb4d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Set existing NULL values to False
    op.execute(
        "UPDATE assistant SET is_default_assistant = FALSE WHERE is_default_assistant IS NULL"
    )

    # Alter the column to be not nullable with a default value of False
    op.alter_column(
        "assistant",
        "is_default_assistant",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    )


def downgrade() -> None:
    # Revert the changes
    op.alter_column(
        "assistant",
        "is_default_assistant",
        existing_type=sa.Boolean(),
        nullable=True,
        server_default=None,
    )
