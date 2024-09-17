"""server default chosen assistants

Revision ID: 35e6853a51d5
Revises: c99d76fcd298
Create Date: 2024-09-13 13:20:32.885317

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "35e6853a51d5"
down_revision = "c99d76fcd298"
branch_labels = None
depends_on = None

DEFAULT_ASSISTANTS = [-2, -1, 0]


def upgrade() -> None:
    op.alter_column(
        "user",
        "chosen_assistants",
        type_=postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
        server_default=sa.text(f"'{DEFAULT_ASSISTANTS}'::jsonb"),
    )


def downgrade() -> None:
    op.alter_column(
        "user",
        "chosen_assistants",
        type_=postgresql.JSONB(astext_type=sa.Text()),
        nullable=True,
        server_default=None,
    )
