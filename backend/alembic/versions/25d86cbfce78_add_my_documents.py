from alembic import op
import sqlalchemy as sa
import datetime

# revision identifiers, used by Alembic.
revision = "25d86cbfce78"
down_revision = "a8c2065484e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_folder table with additional 'display_priority' field
    op.create_table(
        "user_folder",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column(
            "parent_id", sa.Integer(), sa.ForeignKey("user_folder.id"), nullable=True
        ),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("display_priority", sa.Integer(), nullable=True, default=0),
        sa.Column("created_at", sa.DateTime(), default=datetime.datetime.utcnow),
    )

    # Migrate data from chat_folder to user_folder
    op.execute(
        """
        INSERT INTO user_folder (id, user_id, name, display_priority, created_at)
        SELECT id, user_id, name, display_priority, CURRENT_TIMESTAMP FROM chat_folder
        """
    )

    # Update chat_session table to reference user_folder instead of chat_folder
    with op.batch_alter_table("chat_session") as batch_op:
        batch_op.drop_constraint("chat_session_chat_folder_fk", type_="foreignkey")
        batch_op.alter_column(
            "folder_id",
            existing_type=sa.Integer(),
            nullable=True,
            existing_nullable=True,
            existing_server_default=None,
        )
        batch_op.create_foreign_key(
            "fk_chat_session_folder_id_user_folder",
            "user_folder",
            ["folder_id"],
            ["id"],
            ondelete="SET NULL",
        )

    # Drop the chat_folder table
    op.drop_table("chat_folder")

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
        sa.Column(
            "created_at",
            sa.DateTime(),
            default=datetime.datetime.utcnow,
        ),
    )

    # Update index_attempt table
    with op.batch_alter_table("index_attempt") as batch_op:
        # Make connector_credential_pair_id nullable
        batch_op.alter_column("connector_credential_pair_id", nullable=True)

        # Add user_file_id column
        batch_op.add_column(sa.Column("user_file_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_index_attempt_user_file", "user_file", ["user_file_id"], ["id"]
        )

        # Add check constraint to ensure only one of connector_credential_pair_id or user_file_id is set
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
    # Recreate chat_folder table
    op.create_table(
        "chat_folder",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("user.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("display_priority", sa.Integer(), nullable=True, default=0),
    )

    # Migrate data back from user_folder to chat_folder
    op.execute(
        """
        INSERT INTO chat_folder (id, user_id, name, display_priority)
        SELECT id, user_id, name, display_priority FROM user_folder
        WHERE id IN (SELECT DISTINCT folder_id FROM chat_session WHERE folder_id IS NOT NULL)
        """
    )

    # Update chat_session table to reference chat_folder again
    with op.batch_alter_table("chat_session") as batch_op:
        batch_op.drop_constraint(
            "fk_chat_session_folder_id_user_folder", type_="foreignkey"
        )
        batch_op.alter_column(
            "folder_id",
            existing_type=sa.Integer(),
            nullable=True,
            existing_nullable=True,
            existing_server_default=None,
        )
        batch_op.create_foreign_key(
            "fk_chat_session_folder_id_chat_folder",
            "chat_folder",
            ["folder_id"],
            ["id"],
            ondelete="SET NULL",
        )

    # Drop the user_folder table
    op.drop_table("user_folder")

    # Revert changes to index_attempt table
    with op.batch_alter_table("index_attempt") as batch_op:
        # Remove index for user_file_id and time_created
        batch_op.drop_index("ix_index_attempt_latest_for_user_file")

        # Remove check constraint
        batch_op.drop_constraint("check_exactly_one_source", type_="check")

        # Remove user_file_id column and its foreign key
        batch_op.drop_constraint("fk_index_attempt_user_file", type_="foreignkey")
        batch_op.drop_column("user_file_id")

        # Make connector_credential_pair_id non-nullable again
        batch_op.alter_column("connector_credential_pair_id", nullable=False)

    # Drop the user_file table
    op.drop_table("user_file")
