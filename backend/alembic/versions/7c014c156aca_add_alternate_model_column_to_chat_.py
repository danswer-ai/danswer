"""Add alternate_model column to chat_message table

Revision ID: 7c014c156aca
Revises: b85f02ec1308
Create Date: 2024-06-04 14:20:30.561030

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7c014c156aca"
down_revision = "b85f02ec1308"
branch_labels = None
depends_on = None

# Eventually, consider adding constraints (appears not to be stored in database-
# and frontend already interfaces with typescript package, so should be good for now as is).

# def upgrade():
#     op.add_column(
#         "chat_message", sa.Column("alternate_model", sa.Integer(), nullable=True)
#     )

#     op.create_foreign_key(
#         "fk_chat_message_model",
#         "chat_message",
#         "?",
#         ["?"],
#         ["?"],
#     )

# def downgrade() -> None:
#     op.drop_constraint("fk_chat_message_model", "chat_message", type_="foreignkey")
#     op.drop_column("chat_message", "alternate_model")


def upgrade():
    op.add_column(
        "chat_message",
        sa.Column("alternate_model", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("chat_message", "alternate_model")
