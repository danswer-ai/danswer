"""Admin Users

Revision ID: c25e99af4539
Revises: 2666d766cb9b
Create Date: 2023-05-07 00:38:02.137210

"""
import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "c25e99af4539"
down_revision = "2666d766cb9b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column(
            "role",
            sa.Enum("BASIC", "ADMIN", name="userrole", native_enum=False),
            default="BASIC",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("user", "role")
