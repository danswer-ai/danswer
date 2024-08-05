"""Added model deafults for users

Revision ID: 7477a5f5d728
Revises: 1d6ad76d1f37
Create Date: 2024-08-04 19:00:04.512634

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "7477a5f5d728"
down_revision = "1d6ad76d1f37"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("default_model", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "default_model")
