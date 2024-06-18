"""added-prune-frequency

Revision ID: e209dc5a8156
Revises: b85f02ec1308
Create Date: 2024-06-16 16:02:35.273231

"""
from alembic import op
import sqlalchemy as sa

revision = "e209dc5a8156"
down_revision = "b85f02ec1308"
branch_labels = None  # type: ignore
depends_on = None  # type: ignore


def upgrade() -> None:
    op.add_column("connector", sa.Column("prune_freq", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("connector", "prune_freq")
