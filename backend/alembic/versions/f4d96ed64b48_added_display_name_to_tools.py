"""added display_name to tools

Revision ID: f4d96ed64b48
Revises: 2c046a12bdc5
Create Date: 2024-06-20 10:11:28.341184

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "f4d96ed64b48"
down_revision = "2c046a12bdc5"


def upgrade() -> None:
    op.add_column(
        "tool", sa.Column("display_name", sa.String(), nullable=True)
    )

def downgrade() -> None:
    op.drop_column("tool", "display_name")