"""Add Attempt Index

Revision ID: b6d80dbbf8c2
Revises: 27c6ecc08586
Create Date: 2023-06-09 18:22:47.786319

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "b6d80dbbf8c2"
down_revision = "27c6ecc08586"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "idx_index_attempt_last_success",
        "index_attempt",
        ["connector_id", "credential_id", "status", "time_created"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_index_attempt_last_success", table_name="index_attempt")
