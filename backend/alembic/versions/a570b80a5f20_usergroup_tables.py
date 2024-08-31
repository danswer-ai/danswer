"""Teamspace tables

Revision ID: a570b80a5f20
Revises: 904451035c9b
Create Date: 2023-10-02 12:27:10.265725

"""
from alembic import op
import fastapi_users_db_sqlalchemy
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a570b80a5f20"
down_revision = "904451035c9b"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.create_table(
        "teamspace",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("is_up_to_date", sa.Boolean(), nullable=False),
        sa.Column("is_up_for_deletion", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "user__teamspace",
        sa.Column("teamspace_id", sa.Integer(), nullable=False),
        sa.Column(
            "user_id",
            fastapi_users_db_sqlalchemy.generics.GUID(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["teamspace_id"],
            ["teamspace.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("teamspace_id", "user_id"),
    )
    op.create_table(
        "teamspace__connector_credential_pair",
        sa.Column("teamspace_id", sa.Integer(), nullable=False),
        sa.Column("cc_pair_id", sa.Integer(), nullable=False),
        sa.Column("is_current", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["cc_pair_id"],
            ["connector_credential_pair.id"],
        ),
        sa.ForeignKeyConstraint(
            ["teamspace_id"],
            ["teamspace.id"],
        ),
        sa.PrimaryKeyConstraint("teamspace_id", "cc_pair_id", "is_current"),
    )


def downgrade() -> None:
    op.drop_table("teamspace__connector_credential_pair")
    op.drop_table("user__teamspace")
    op.drop_table("teamspace")
