"""assistant_rework

Revision ID: 55546a7967ee
Revises: 35e6853a51d5
Create Date: 2024-09-18 17:00:23.755399

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "55546a7967ee"
down_revision = "35e6853a51d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add builtin_persona column
    op.add_column("persona", sa.Column("builtin_persona", sa.Boolean(), nullable=True))

    # Update existing rows to set builtin_persona based on default_persona
    op.execute("UPDATE persona SET builtin_persona = default_persona")

    # Make builtin_persona non-nullable
    op.alter_column("persona", "builtin_persona", nullable=False)

    # Drop the old index
    op.drop_index("_default_persona_name_idx", table_name="persona")

    # Create the new index
    op.create_index(
        "_builtin_persona_name_idx",
        "persona",
        ["name"],
        unique=True,
        postgresql_where=sa.text("builtin_persona = true"),
    )

    # Add visible_assistants and hidden_assistants columns to User table
    op.add_column(
        "user", sa.Column("visible_assistants", postgresql.JSONB(), nullable=True)
    )
    op.add_column(
        "user", sa.Column("hidden_assistants", postgresql.JSONB(), nullable=True)
    )

    # Set default values for new columns
    op.execute(
        "UPDATE \"user\" SET visible_assistants = '[]'::jsonb, hidden_assistants = '[]'::jsonb"
    )

    # Make new columns non-nullable
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
    op.drop_column("persona", "default_persona")
    op.add_column(
        "persona", sa.Column("is_default_persona", sa.Boolean(), nullable=True)
    )


def downgrade() -> None:
    # Drop the new columns from User table
    op.drop_column("user", "hidden_assistants")
    op.drop_column("user", "visible_assistants")

    # Drop the new index
    op.drop_index("_builtin_persona_name_idx", table_name="persona")

    # Recreate the old index
    op.create_index(
        "_default_persona_name_idx",
        "persona",
        ["name"],
        unique=True,
        postgresql_where=sa.text("default_persona = true"),
    )

    # Drop the builtin_persona column
    op.drop_column("persona", "builtin_persona")
    op.drop_column("persona", "is_default_persona")
