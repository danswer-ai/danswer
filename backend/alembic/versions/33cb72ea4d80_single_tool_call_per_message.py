"""single tool call per message

Revision ID: 33cb72ea4d80
Revises: 949b4a92a401
Create Date: 2024-11-01 12:51:01.535003

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "33cb72ea4d80"
down_revision = "949b4a92a401"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add 'message_id' column to 'tool_call' table
    op.add_column("tool_call", sa.Column("message_id", sa.Integer(), nullable=True))

    # 2. Create foreign key constraint from 'tool_call.message_id' to 'chat_message.id'
    op.create_foreign_key(
        "fk_tool_call_message_id",
        "tool_call",
        "chat_message",
        ["message_id"],
        ["id"],
    )

    # 3. Migrate existing data from 'chat_message.tool_call_id' to 'tool_call.message_id'
    op.execute(
        """
        UPDATE tool_call
        SET message_id = chat_message.id
        FROM chat_message
        WHERE chat_message.tool_call_id = tool_call.id
        """
    )

    # 4. Drop the foreign key constraint and column 'tool_call_id' from 'chat_message' table
    op.drop_constraint("fk_chat_message_tool_call", "chat_message", type_="foreignkey")
    op.drop_column("chat_message", "tool_call_id")

    # 5. Optionally drop the unique constraint if it was previously added
    # op.drop_constraint("uq_chat_message_tool_call_id", "chat_message", type_="unique")


def downgrade() -> None:
    # 1. Add 'tool_call_id' column back to 'chat_message' table
    op.add_column(
        "chat_message", sa.Column("tool_call_id", sa.Integer(), nullable=True)
    )

    # 2. Restore foreign key constraint from 'chat_message.tool_call_id' to 'tool_call.id'
    op.create_foreign_key(
        "fk_chat_message_tool_call",
        "chat_message",
        "tool_call",
        ["tool_call_id"],
        ["id"],
    )

    # 3. Migrate data back from 'tool_call.message_id' to 'chat_message.tool_call_id'
    op.execute(
        """
        UPDATE chat_message
        SET tool_call_id = tool_call.id
        FROM tool_call
        WHERE tool_call.message_id = chat_message.id
        """
    )

    # 4. Drop the foreign key constraint and column 'message_id' from 'tool_call' table
    op.drop_constraint("fk_tool_call_message_id", "tool_call", type_="foreignkey")
    op.drop_column("tool_call", "message_id")
