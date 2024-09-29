from alembic import op
import sqlalchemy as sa
from alembic import context

# revision identifiers, used by Alembic.
revision = "14a83a331951"
down_revision = "46b7a812670f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # TODO: improve implementation of this
    schema = context.get_x_argument(as_dictionary=True).get("schema", "public")
    if schema != "public":
        # Skip this migration for schemas other than 'public'
        return

    op.create_table(
        "user_tenant_mapping",
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("tenant_id", sa.String(), nullable=False),
        sa.UniqueConstraint("email", "tenant_id", name="uq_user_tenant"),
        schema="public",
    )


def downgrade() -> None:
    schema = context.get_x_argument(as_dictionary=True).get("schema", "public")
    if schema != "public":
        # Skip this migration for schemas other than 'public'
        return

    op.drop_table("user_tenant_mapping", schema="public")
