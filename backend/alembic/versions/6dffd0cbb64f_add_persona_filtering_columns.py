"""add persona filtering columns

Revision ID: 6dffd0cbb64f
Revises: bc9771dccadf
Create Date: 2024-06-26 11:26:22.013659

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6dffd0cbb64f"
down_revision = "bc9771dccadf"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.add_column(
        "persona", sa.Column("use_recent_documents", sa.Boolean(), nullable=True)
    )
    op.execute("UPDATE persona SET use_recent_documents = false")
    op.alter_column("persona", "use_recent_documents", nullable=False)
    op.add_column("persona", sa.Column("num_days", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("persona", "use_recent_documents")
    op.drop_column("persona", "num_days")
