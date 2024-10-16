"""
Revision ID: 6756efa39ada
Revises: 5d12a446f5c0
Create Date: 2024-10-15 17:47:44.108537
"""
from alembic import op
import sqlalchemy as sa

revision = "6756efa39ada"
down_revision = "5d12a446f5c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Ensure the pgcrypto extension is available for gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # Add 'new_id' column to 'chat_session' with UUIDs generated in the database
    op.add_column(
        "chat_session",
        sa.Column(
            "new_id",
            sa.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
    )

    # Update existing records to have a 'new_id' generated
    op.execute("UPDATE chat_session SET new_id = gen_random_uuid();")

    # Add 'new_chat_session_id' column to 'chat_message'
    op.add_column(
        "chat_message",
        sa.Column("new_chat_session_id", sa.UUID(as_uuid=True), nullable=True),
    )

    # Update 'chat_message' to reference the new UUIDs in 'chat_session'
    op.execute(
        """
        UPDATE chat_message
        SET new_chat_session_id = cs.new_id
        FROM chat_session cs
        WHERE chat_message.chat_session_id = cs.id;
        """
    )

    # Remove old foreign key constraint from 'chat_message'
    op.drop_constraint(
        "chat_message_chat_session_id_fkey", "chat_message", type_="foreignkey"
    )

    # Drop the old 'chat_session_id' column and rename 'new_chat_session_id'
    op.drop_column("chat_message", "chat_session_id")
    op.alter_column(
        "chat_message", "new_chat_session_id", new_column_name="chat_session_id"
    )

    # Drop the old primary key constraint and 'id' column from 'chat_session'
    op.drop_constraint("chat_session_pkey", "chat_session", type_="primary")
    op.drop_column("chat_session", "id")
    op.alter_column("chat_session", "new_id", new_column_name="id")

    # Set the new 'id' as the primary key
    op.create_primary_key("chat_session_pkey", "chat_session", ["id"])

    # Add the new foreign key constraint to 'chat_message'
    op.create_foreign_key(
        "chat_message_chat_session_id_fkey",
        "chat_message",
        "chat_session",
        ["chat_session_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # Remove the foreign key constraint from 'chat_message' first
    op.drop_constraint(
        "chat_message_chat_session_id_fkey", "chat_message", type_="foreignkey"
    )

    # Add 'old_id' column back to 'chat_session' with autoincrementing sequence
    op.add_column(
        "chat_session",
        sa.Column("old_id", sa.Integer, autoincrement=True, nullable=False),
    )

    # Create a sequence for 'old_id' and set it as the default
    op.execute("CREATE SEQUENCE chat_session_old_id_seq OWNED BY chat_session.old_id;")
    op.execute(
        "ALTER TABLE chat_session ALTER COLUMN old_id SET DEFAULT nextval('chat_session_old_id_seq');"
    )

    # Set the sequence's current value based on the maximum existing 'old_id'
    op.execute(
        "SELECT setval('chat_session_old_id_seq', COALESCE(MAX(old_id), 1)) FROM chat_session;"
    )

    # Update 'old_id' for existing records
    op.execute(
        "UPDATE chat_session SET old_id = nextval('chat_session_old_id_seq') WHERE old_id IS NULL;"
    )

    # Now it's safe to remove the primary key constraint and set 'old_id' as the new primary key
    op.drop_constraint("chat_session_pkey", "chat_session", type_="primary")
    op.create_primary_key("chat_session_pkey", "chat_session", ["old_id"])

    # Add 'old_chat_session_id' to 'chat_message'
    op.add_column(
        "chat_message",
        sa.Column("old_chat_session_id", sa.Integer, nullable=True),
    )

    # Update 'chat_message' to reference the 'old_id' in 'chat_session'
    op.execute(
        """
        UPDATE chat_message
        SET old_chat_session_id = cs.old_id
        FROM chat_session cs
        WHERE chat_message.chat_session_id = cs.id;
        """
    )

    # Drop the 'chat_session_id' column and rename 'old_chat_session_id'
    op.drop_column("chat_message", "chat_session_id")
    op.alter_column(
        "chat_message", "old_chat_session_id", new_column_name="chat_session_id"
    )

    # Add the foreign key constraint back to 'chat_message'
    op.create_foreign_key(
        "chat_message_chat_session_id_fkey",
        "chat_message",
        "chat_session",
        ["chat_session_id"],
        ["old_id"],
        ondelete="CASCADE",
    )

    # Drop the 'id' column from 'chat_session' and rename 'old_id' back to 'id'
    op.drop_column("chat_session", "id")
    op.alter_column("chat_session", "old_id", new_column_name="id")

    # Remove the default value from the 'id' column
    op.alter_column("chat_session", "id", server_default=None)

    # Drop the sequence used for 'old_id'
    op.execute("DROP SEQUENCE IF EXISTS chat_session_old_id_seq;")
