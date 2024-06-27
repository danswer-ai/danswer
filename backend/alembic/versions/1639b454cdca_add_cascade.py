"""add-cascade

Revision ID: 1639b454cdca
Revises: bc9771dccadf
Create Date: 2024-06-27 13:31:11.854818

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "1639b454cdca"
down_revision = "bc9771dccadf"
branch_labels = None  # type: ignore
depends_on = None  # type: ignore


def upgrade() -> None:
    # Drop the existing foreign key constraint
    op.drop_constraint(
        "chat_message_chat_session_id_fkey", "chat_message", type_="foreignkey"
    )
    op.drop_constraint(
        "chat_message__search_doc_chat_message_id_fkey",
        "chat_message__search_doc",
        type_="foreignkey",
    )

    # Re-create the foreign key constraint with ON DELETE CASCADE
    op.create_foreign_key(
        "chat_message_chat_session_id_fkey",
        "chat_message",
        "chat_session",
        ["chat_session_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "chat_message__search_doc_chat_message_id_fkey",
        "chat_message__search_doc",
        "chat_message",
        ["chat_message_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    # Drop the CASCADE foreign key constraints
    op.drop_constraint(
        "chat_message_chat_session_id_fkey", "chat_message", type_="foreignkey"
    )
    op.drop_constraint(
        "chat_message__search_doc_chat_message_id_fkey",
        "chat_message__search_doc",
        type_="foreignkey",
    )

    # Re-create the original foreign key constraints without CASCADE
    op.create_foreign_key(
        "chat_message_chat_session_id_fkey",
        "chat_message",
        "chat_session",
        ["chat_session_id"],
        ["id"],
    )
    op.create_foreign_key(
        "chat_message__search_doc_chat_message_id_fkey",
        "chat_message__search_doc",
        "chat_message",
        ["chat_message_id"],
        ["id"],
    )
