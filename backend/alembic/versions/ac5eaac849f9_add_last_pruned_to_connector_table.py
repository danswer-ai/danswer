"""add last_pruned and needs_pruning to the connector table

Revision ID: ac5eaac849f9
Revises: 52a219fb5233
Create Date: 2024-09-10 15:04:26.437118

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "ac5eaac849f9"
down_revision = "f32615f71aeb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # last pruned represents the last time the connector was pruned
    op.add_column(
        "connector",
        sa.Column("last_pruned", sa.DateTime(timezone=True), nullable=True),
    )

    # a flag that can be set to trigger pruning immediately
    op.add_column(
        "connector",
        sa.Column(
            "needs_pruning", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )


def downgrade() -> None:
    op.drop_column("connector", "needs_pruning")
    op.drop_column("connector", "last_pruned")
