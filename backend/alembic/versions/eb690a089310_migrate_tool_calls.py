"""migrate tool calls

Revision ID: eb690a089310
Revises: 4a951134c801
Create Date: 2024-08-04 17:07:47.533051

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "eb690a089310"
down_revision = "4a951134c801"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the new column
    op.add_column(
        "chat_message", sa.Column("tool_call_id", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        "fk_chat_message_tool_call",
        "chat_message",
        "tool_call",
        ["tool_call_id"],
        ["id"],
    )

    # Migrate existing data
    op.execute(
        "UPDATE chat_message SET tool_call_id = (SELECT id FROM tool_call WHERE tool_call.message_id = chat_message.id LIMIT 1)"
    )

    # Drop the old relationship
    op.drop_constraint("tool_call_message_id_fkey", "tool_call", type_="foreignkey")
    op.drop_column("tool_call", "message_id")


def downgrade() -> None:
    # Add back the old column
    op.add_column(
        "tool_call",
        sa.Column("message_id", sa.INTEGER(), autoincrement=False, nullable=True),
    )
    op.create_foreign_key(
        "tool_call_message_id_fkey", "tool_call", "chat_message", ["message_id"], ["id"]
    )

    # Migrate data back
    op.execute(
        "UPDATE tool_call SET message_id = (SELECT id FROM chat_message WHERE chat_message.tool_call_id = tool_call.id)"
    )

    # Drop the new column
    op.drop_constraint("fk_chat_message_tool_call", "chat_message", type_="foreignkey")
    op.drop_column("chat_message", "tool_call_id")
