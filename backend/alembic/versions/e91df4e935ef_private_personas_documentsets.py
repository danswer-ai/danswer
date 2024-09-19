"""Private Assistants DocumentSets

Revision ID: e91df4e935ef
Revises: 91fd3b470d1a
Create Date: 2024-03-17 11:47:24.675881

"""
import fastapi_users_db_sqlalchemy
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "e91df4e935ef"
down_revision = "91fd3b470d1a"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.create_table(
        "document_set__user",
        sa.Column("document_set_id", sa.Integer(), nullable=False),
        sa.Column(
            "user_id",
            fastapi_users_db_sqlalchemy.generics.GUID(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_set_id"],
            ["document_set.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("document_set_id", "user_id"),
    )
    op.create_table(
        "assistant__user",
        sa.Column("assistant_id", sa.Integer(), nullable=False),
        sa.Column(
            "user_id",
            fastapi_users_db_sqlalchemy.generics.GUID(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["assistant_id"],
            ["assistant.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
        ),
        sa.PrimaryKeyConstraint("assistant_id", "user_id"),
    )
    op.create_table(
        "document_set__teamspace",
        sa.Column("document_set_id", sa.Integer(), nullable=False),
        sa.Column(
            "teamspace_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_set_id"],
            ["document_set.id"],
        ),
        sa.ForeignKeyConstraint(
            ["teamspace_id"],
            ["teamspace.id"],
        ),
        sa.PrimaryKeyConstraint("document_set_id", "teamspace_id"),
    )
    op.create_table(
        "assistant__teamspace",
        sa.Column("assistant_id", sa.Integer(), nullable=False),
        sa.Column(
            "teamspace_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["assistant_id"],
            ["assistant.id"],
        ),
        sa.ForeignKeyConstraint(
            ["teamspace_id"],
            ["teamspace.id"],
        ),
        sa.PrimaryKeyConstraint("assistant_id", "teamspace_id"),
    )

    op.add_column(
        "document_set",
        sa.Column("is_public", sa.Boolean(), nullable=True),
    )
    # fill in is_public for existing rows
    op.execute("UPDATE document_set SET is_public = true WHERE is_public IS NULL")
    op.alter_column("document_set", "is_public", nullable=False)

    op.add_column(
        "assistant",
        sa.Column("is_public", sa.Boolean(), nullable=True),
    )
    # fill in is_public for existing rows
    op.execute("UPDATE assistant SET is_public = true WHERE is_public IS NULL")
    op.alter_column("assistant", "is_public", nullable=False)


def downgrade() -> None:
    op.drop_column("assistant", "is_public")

    op.drop_column("document_set", "is_public")

    op.drop_table("assistant__user")
    op.drop_table("document_set__user")
    op.drop_table("assistant__teamspace")
    op.drop_table("document_set__teamspace")
