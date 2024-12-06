"""add my documents and update index_attempt

Revision ID: 25d86cbfce78
Revises: a8c2065484e6
Create Date: 2024-12-03 13:29:52.682591

"""

from alembic import op
import sqlalchemy as sa
import datetime

# revision identifiers, used by Alembic.
revision = "25d86cbfce78"
down_revision = "a8c2065484e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_folder table
    op.create_table(
        "user_folder",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column(
            "parent_id", sa.Integer(), sa.ForeignKey("user_folder.id"), nullable=True
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), default=datetime.datetime.utcnow),
    )

    # Create user_file table
    op.create_table(
        "user_file",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column(
            "parent_folder_id",
            sa.Integer(),
            sa.ForeignKey("user_folder.id"),
            nullable=True,
        ),
        sa.Column("file_id", sa.String(length=255), nullable=False),
        sa.Column("document_id", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), default=datetime.datetime.utcnow),
    )

    # Update index_attempt table
    with op.batch_alter_table("index_attempt") as batch_op:
        # Make connector_credential_pair_id nullable
        batch_op.alter_column("connector_credential_pair_id", nullable=True)

        # Add user_file_id column
        batch_op.add_column(sa.Column("user_file_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_index_attempt_user_file",
            "user_file",
            ["user_file_id"],
            ["id"],
        )

        # Add check constraint
        batch_op.create_check_constraint(
            "check_exactly_one_source",
            "(connector_credential_pair_id IS NULL) != (user_file_id IS NULL)",
        )

        # Add index for user_file_id and time_created
        batch_op.create_index(
            "ix_index_attempt_latest_for_user_file",
            ["user_file_id", "time_created"],
        )


def downgrade() -> None:
    # Revert changes to index_attempt table
    with op.batch_alter_table("index_attempt") as batch_op:
        # Remove index for user_file_id and time_created
        batch_op.drop_index("ix_index_attempt_latest_for_user_file")

        # Remove check constraint
        batch_op.drop_constraint("check_exactly_one_source")

        # Remove user_file_id column and its foreign key
        batch_op.drop_constraint("fk_index_attempt_user_file", type_="foreignkey")
        batch_op.drop_column("user_file_id")

        # Make connector_credential_pair_id non-nullable again
        batch_op.alter_column("connector_credential_pair_id", nullable=False)

    # Drop user_file table
    op.drop_table("user_file")

    # Drop user_folder table
    op.drop_table("user_folder")
