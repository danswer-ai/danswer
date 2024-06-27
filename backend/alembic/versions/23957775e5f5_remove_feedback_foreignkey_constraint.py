"""remove-feedback-foreignkey-constraint

Revision ID: 23957775e5f5
Revises: bc9771dccadf
Create Date: 2024-06-27 16:04:51.480437

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "23957775e5f5"
down_revision = "bc9771dccadf"
branch_labels = None  # type: ignore
depends_on = None  # type: ignore


def upgrade():
    # Use batch mode for databases like SQLite
    with op.batch_alter_table("chat_feedback", schema=None) as batch_op:
        batch_op.drop_constraint("chat_feedback__chat_message_fk", type_="foreignkey")
        batch_op.create_foreign_key(
            "chat_feedback__chat_message_fk",
            "chat_message",
            ["chat_message_id"],
            ["id"],
            ondelete="SET NULL",
        )
    op.alter_column(
        "chat_feedback", "chat_message_id", existing_type=sa.Integer(), nullable=True
    )
    op.alter_column(
        "document_retrieval_feedback",
        "chat_message_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade():
    with op.batch_alter_table("chat_feedback", schema=None) as batch_op:
        batch_op.drop_constraint("chat_feedback__chat_message_fk", type_="foreignkey")
        batch_op.create_foreign_key(
            "chat_feedback__chat_message_fk",
            "chat_message",
            ["chat_message_id"],
            ["id"],
            ondelete="CASCADE",  # or whatever it was originally
        )
    op.alter_column(
        "chat_feedback", "chat_message_id", existing_type=sa.Integer(), nullable=False
    )
    op.alter_column(
        "document_retrieval_feedback",
        "chat_message_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
