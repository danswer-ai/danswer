"""add_llm_group_permissions_control

Revision ID: 795b20b85b4b
Revises: 05c07bf07c00
Create Date: 2024-07-19 11:54:35.701558

"""
from alembic import op
import sqlalchemy as sa


revision = "795b20b85b4b"
down_revision = "05c07bf07c00"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.create_table(
        "llm_provider__teamspace",
        sa.Column("llm_provider_id", sa.Integer(), nullable=False),
        sa.Column("teamspace_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["llm_provider_id"],
            ["llm_provider.id"],
        ),
        sa.ForeignKeyConstraint(
            ["teamspace_id"],
            ["teamspace.id"],
        ),
        sa.PrimaryKeyConstraint("llm_provider_id", "teamspace_id"),
    )
    op.add_column(
        "llm_provider",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    op.drop_table("llm_provider__teamspace")
    op.drop_column("llm_provider", "is_public")
