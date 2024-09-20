"""non_nullable_default_persona

Revision ID: 59d08a76d335
Revises: 55546a7967ee
Create Date: 2024-09-20 09:13:55.631012

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "59d08a76d335"
down_revision = "55546a7967ee"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Set existing NULL values to False
    op.execute(
        "UPDATE persona SET is_default_persona = FALSE WHERE is_default_persona IS NULL"
    )

    # Alter the column to be not nullable with a default value of False
    op.alter_column(
        "persona",
        "is_default_persona",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    )


def downgrade() -> None:
    # Revert the changes
    op.alter_column(
        "persona",
        "is_default_persona",
        existing_type=sa.Boolean(),
        nullable=True,
        server_default=None,
    )
