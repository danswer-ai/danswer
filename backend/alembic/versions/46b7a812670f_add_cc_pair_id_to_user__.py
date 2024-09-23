"""Change primary key of user__external_user_group_id

Revision ID: 46b7a812670f
Revises: bd2921608c3a
Create Date: 2024-09-23 12:58:03.894038

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "46b7a812670f"
down_revision = "bd2921608c3a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the existing primary key
    op.drop_constraint(
        "user__external_user_group_id_pkey",
        "user__external_user_group_id",
        type_="primary",
    )

    # Add the new composite primary key
    op.create_primary_key(
        "user__external_user_group_id_pkey",
        "user__external_user_group_id",
        ["user_id", "external_user_group_id"],
    )


def downgrade() -> None:
    # Drop the composite primary key
    op.drop_constraint(
        "user__external_user_group_id_pkey",
        "user__external_user_group_id",
        type_="primary",
    )

    # Recreate the original primary key on user_id
    op.create_primary_key(
        "user__external_user_group_id_pkey", "user__external_user_group_id", ["user_id"]
    )
