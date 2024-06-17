"""Add standard_answer tables

Revision ID: c18cdf4b497e
Revises: b85f02ec1308
Create Date: 2024-06-06 15:15:02.000648

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "c18cdf4b497e"
down_revision = "b85f02ec1308"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "standard_answer",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("keyword", sa.String(), nullable=False),
        sa.Column("answer", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("keyword"),
    )
    op.create_table(
        "standard_answer_category",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "standard_answer__standard_answer_category",
        sa.Column("standard_answer_id", sa.Integer(), nullable=False),
        sa.Column("standard_answer_category_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["standard_answer_category_id"],
            ["standard_answer_category.id"],
        ),
        sa.ForeignKeyConstraint(
            ["standard_answer_id"],
            ["standard_answer.id"],
        ),
        sa.PrimaryKeyConstraint("standard_answer_id", "standard_answer_category_id"),
    )
    op.create_table(
        "slack_bot_config__standard_answer_category",
        sa.Column("slack_bot_config_id", sa.Integer(), nullable=False),
        sa.Column("standard_answer_category_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["slack_bot_config_id"],
            ["slack_bot_config.id"],
        ),
        sa.ForeignKeyConstraint(
            ["standard_answer_category_id"],
            ["standard_answer_category.id"],
        ),
        sa.PrimaryKeyConstraint("slack_bot_config_id", "standard_answer_category_id"),
    )


def downgrade() -> None:
    op.drop_table("slack_bot_config__standard_answer_category")
    op.drop_table("standard_answer__standard_answer_category")
    op.drop_table("standard_answer_category")
    op.drop_table("standard_answer")
