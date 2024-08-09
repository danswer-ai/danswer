"""workspaces relationship fix

Revision ID: 27503deb5495
Revises: 9fe292cac241
Create Date: 2024-08-09 17:17:34.104008

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "27503deb5495"
down_revision = "9fe292cac241"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "workspace__user_group",
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("user_group_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_group_id"],
            ["user_group.id"],
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspace.workspace_id"],
        ),
        sa.PrimaryKeyConstraint("workspace_id", "user_group_id"),
    )
    #op.drop_constraint("chat_message_id_key", "chat_message", type_="unique")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_unique_constraint("chat_message_id_key", "chat_message", ["id"])
    op.drop_table("workspace__user_group")
    # ### end Alembic commands ###
