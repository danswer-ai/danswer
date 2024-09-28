"""Create UserTenantMapping table

Revision ID: 14a83a331951
Revises: 46b7a812670f
Create Date: 2024-09-28 14:32:28.922878

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "14a83a331951"
down_revision = "46b7a812670f"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_tenant_mapping",
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.UniqueConstraint("email", "tenant_id", name="uq_user_tenant"),
        schema="public",
    )


def downgrade():
    op.drop_table("user_tenant_mapping", schema="public")
