"""Add assistant to chat_session

Revision ID: e86866a9c78a
Revises: 80696cf850ae
Create Date: 2023-11-26 02:51:47.657357

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "e86866a9c78a"
down_revision = "80696cf850ae"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.add_column("chat_session", sa.Column("assistant_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_chat_session_assistant_id", "chat_session", "assistant", ["assistant_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("fk_chat_session_assistant_id", "chat_session", type_="foreignkey")
    op.drop_column("chat_session", "assistant_id")
