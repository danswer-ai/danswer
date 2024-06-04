"""Add alternate_model column to chat_message table

Revision ID: 7c014c156aca
Revises: b85f02ec1308
Create Date: 2024-06-04 14:20:30.561030

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7c014c156aca"
down_revision = "b85f02ec1308"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "chat_message",
        sa.Column("alternate_model", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chat_message", "alternate_model")
