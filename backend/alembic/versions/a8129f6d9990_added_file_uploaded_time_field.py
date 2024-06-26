"""added-file-uploaded-time-field

Revision ID: a8129f6d9990
Revises: bc9771dccadf
Create Date: 2024-06-19 12:32:59.847911

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a8129f6d9990"
down_revision = "bc9771dccadf"
branch_labels = None  # type: ignore
depends_on = None  # type: ignore


def upgrade() -> None:
    op.add_column(
        "file_store",
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("file_store", "uploaded_at")
