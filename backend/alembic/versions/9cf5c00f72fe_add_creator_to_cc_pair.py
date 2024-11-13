"""add creator to cc pair

Revision ID: 9cf5c00f72fe
Revises: c0fd6e4da83a
Create Date: 2024-11-12 15:16:42.682902

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "9cf5c00f72fe"
down_revision = "c0fd6e4da83a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "connector_credential_pair",
        sa.Column(
            "creator_id",
            sa.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        None, "connector_credential_pair", "user", ["creator_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_column("connector_credential_pair", "creator_id")
