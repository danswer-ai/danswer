"""Add curator fields

Revision ID: 351faebd379d
Revises: 4a951134c801
Create Date: 2024-08-15 22:37:08.397052

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "351faebd379d"
down_revision = "4a951134c801"
branch_labels = None
depends_on = None


def upgrade():
    # Add is_curator column to User__UserGroup table
    op.add_column(
        "user__user_group",
        sa.Column("is_curator", sa.Boolean(), nullable=False, server_default="false"),
    )

    # Use batch mode to modify the enum type
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.alter_column(
            "role",
            type_=sa.Enum(
                "BASIC",
                "ADMIN",
                "CURATOR",
                "GLOBAL_CURATOR",
                name="userrole",
                native_enum=False,
            ),
            existing_type=sa.Enum("BASIC", "ADMIN", name="userrole", native_enum=False),
            existing_nullable=False,
        )


def downgrade():
    # Remove is_curator column from User__UserGroup table
    op.drop_column("user__user_group", "is_curator")
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.alter_column(
            "role",
            type_=sa.Enum("BASIC", "ADMIN", name="userrole", native_enum=False),
            existing_type=sa.Enum(
                "BASIC",
                "ADMIN",
                "CURATOR",
                "GLOBAL_CURATOR",
                name="userrole",
                native_enum=False,
            ),
            existing_nullable=False,
        )
