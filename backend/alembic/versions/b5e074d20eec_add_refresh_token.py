"""Add refresh token

Revision ID: b5e074d20eec
Revises: f17bf3b0d9f1
Create Date: 2024-08-26 11:56:15.711052

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b5e074d20eec"
down_revision = "f17bf3b0d9f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user", sa.Column("refresh_token", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("user", "refresh_token")
