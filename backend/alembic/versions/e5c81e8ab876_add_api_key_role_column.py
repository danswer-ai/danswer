"""Add api_key role column

Revision ID: e5c81e8ab876
Revises: 4a951134c801
Create Date: 2024-08-12 16:20:23.023077

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "e5c81e8ab876"
down_revision = "4a951134c801"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "api_key",
        sa.Column(
            "user_role",
            sa.Enum("BASIC", "ADMIN", name="userrole", native_enum=False),
            nullable=False,
            server_default="BASIC",
        ),
    )


def downgrade() -> None:
    op.drop_column("api_key", "user_role")
