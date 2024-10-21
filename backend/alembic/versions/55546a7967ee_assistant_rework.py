"""assistant_rework

Revision ID: 55546a7967ee
Revises: 61ff3651add4
Create Date: 2024-09-18 17:00:23.755399

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "55546a7967ee"
down_revision = "61ff3651add4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Reworking assistant and user tables for new assistant features
    # keep track of user's chosen assistants separate from their `ordering`
    op.add_column(
        "assistant", sa.Column("builtin_assistant", sa.Boolean(), nullable=True)
    )
    op.execute("UPDATE assistant SET builtin_assistant = default_assistant")
    op.alter_column("assistant", "builtin_assistant", nullable=False)
    op.drop_index("_default_assistant_name_idx", table_name="assistant")
    op.create_index(
        "_builtin_assistant_name_idx",
        "assistant",
        ["name"],
        unique=True,
        postgresql_where=sa.text("builtin_assistant = true"),
    )

    op.add_column(
        "user", sa.Column("visible_assistants", postgresql.JSONB(), nullable=True)
    )
    op.add_column(
        "user", sa.Column("hidden_assistants", postgresql.JSONB(), nullable=True)
    )
    op.execute(
        "UPDATE \"user\" SET visible_assistants = '[]'::jsonb, hidden_assistants = '[]'::jsonb"
    )
    op.alter_column(
        "user",
        "visible_assistants",
        nullable=False,
        server_default=sa.text("'[]'::jsonb"),
    )
    op.alter_column(
        "user",
        "hidden_assistants",
        nullable=False,
        server_default=sa.text("'[]'::jsonb"),
    )
    op.drop_column("assistant", "default_assistant")
    op.add_column(
        "assistant", sa.Column("is_default_assistant", sa.Boolean(), nullable=True)
    )


def downgrade() -> None:
    # Reverting changes made in upgrade
    op.drop_column("user", "hidden_assistants")
    op.drop_column("user", "visible_assistants")
    op.drop_index("_builtin_assistant_name_idx", table_name="assistant")

    op.drop_column("assistant", "is_default_assistant")
    op.add_column(
        "assistant", sa.Column("default_assistant", sa.Boolean(), nullable=True)
    )
    op.execute("UPDATE assistant SET default_assistant = builtin_assistant")
    op.alter_column("assistant", "default_assistant", nullable=False)
    op.drop_column("assistant", "builtin_assistant")
    op.create_index(
        "_default_assistant_name_idx",
        "assistant",
        ["name"],
        unique=True,
        postgresql_where=sa.text("default_assistant = true"),
    )
