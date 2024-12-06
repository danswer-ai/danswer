"""add my documents

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


def downgrade() -> None:
    # Drop user_file table
    op.drop_table("user_file")

    # Drop user_folder table
    op.drop_table("user_folder")
