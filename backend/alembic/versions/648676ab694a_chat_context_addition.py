"""Chat Context Addition

Revision ID: 648676ab694a
Revises: 5809c0787398
Create Date: 2023-09-13 12:58:31.164088

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "648676ab694a"
down_revision = "5809c0787398"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_session", sa.Column("contextual", sa.Boolean(), nullable=False))
    op.add_column("chat_session", sa.Column("system_text", sa.Text(), nullable=True))
    op.add_column("chat_session", sa.Column("tools_text", sa.Text(), nullable=True))
    op.add_column("chat_session", sa.Column("hint_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_session", "hint_text")
    op.drop_column("chat_session", "tools_text")
    op.drop_column("chat_session", "system_text")
    op.drop_column("chat_session", "contextual")
