"""additional user info

Revision ID: 900205f44357
Revises: 2c084e6c102a
Create Date: 2024-08-22 08:43:31.016429

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "900205f44357"
down_revision = "2c084e6c102a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    # op.drop_constraint("chat_message_id_key", "chat_message", type_="unique")
    op.add_column("user", sa.Column("workspace_id", sa.Integer(), nullable=True))
    op.add_column("user", sa.Column("full_name", sa.Text(), nullable=True))
    op.add_column("user", sa.Column("company_name", sa.Text(), nullable=True))
    op.add_column("user", sa.Column("company_email", sa.String(), nullable=True))
    op.add_column("user", sa.Column("company_billing", sa.Text(), nullable=True))
    op.add_column(
        "user", sa.Column("billing_email_address", sa.String(), nullable=True)
    )
    op.add_column("user", sa.Column("vat", sa.String(), nullable=True))
    op.create_foreign_key(
        "user_workspace_id_fk", "user", "workspace", ["workspace_id"], ["id"]
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint("user_workspace_id_fk", "user", type_="foreignkey")
    op.drop_column("user", "vat")
    op.drop_column("user", "billing_email_address")
    op.drop_column("user", "company_billing")
    op.drop_column("user", "company_email")
    op.drop_column("user", "company_name")
    op.drop_column("user", "full_name")
    op.drop_column("user", "workspace_id")
    op.create_unique_constraint("chat_message_id_key", "chat_message", ["id"])
    # ### end Alembic commands ###
