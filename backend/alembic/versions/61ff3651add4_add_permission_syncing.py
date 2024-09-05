"""Add Permission Syncing

Revision ID: 61ff3651add4
Revises: bceb1e139447
Create Date: 2024-09-05 13:57:11.770413

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "61ff3651add4"
down_revision = "bceb1e139447"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Admin user who set up connectors will lose access to the docs temporarily
    # only way currently to give back access is to rerun from beginning
    op.execute("CREATE TYPE accesstype AS ENUM ('PUBLIC', 'PRIVATE', 'SYNC')")
    op.add_column(
        "connector_credential_pair",
        sa.Column(
            "access_type",
            sa.Enum("PUBLIC", "PRIVATE", "SYNC", name="accesstype", create_type=False),
            nullable=True,
        ),
    )
    op.execute(
        "UPDATE connector_credential_pair SET access_type = 'PUBLIC' WHERE is_public = true"
    )
    op.execute(
        "UPDATE connector_credential_pair SET access_type = 'PRIVATE' WHERE is_public = false"
    )
    op.alter_column("connector_credential_pair", "access_type", nullable=False)

    op.add_column(
        "connector_credential_pair",
        sa.Column(
            "auto_sync_options",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.drop_column("connector_credential_pair", "is_public")

    op.add_column(
        "document",
        sa.Column("external_user_emails", postgresql.ARRAY(sa.String()), nullable=True),
    )
    op.add_column(
        "document",
        sa.Column("external_user_groups", postgresql.ARRAY(sa.String()), nullable=True),
    )
    op.add_column(
        "document",
        sa.Column("public", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "document",
        sa.Column("last_time_perm_sync", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "email_to_external_user_cache",
        sa.Column(
            "source_type",
            sa.String(),
            nullable=False,
        ),
    )
    op.alter_column("permission_sync_run", "updated_at", new_column_name="start_time")

    op.drop_column("external_permission", "user_id")
    op.drop_column("email_to_external_user_cache", "user_id")
    op.drop_column("permission_sync_run", "cc_pair_id")


def downgrade() -> None:
    op.add_column(
        "connector_credential_pair",
        sa.Column("is_public", sa.BOOLEAN(), nullable=True),
    )
    op.execute(
        "UPDATE connector_credential_pair SET is_public = (access_type = 'PUBLIC')"
    )
    op.alter_column("connector_credential_pair", "is_public", nullable=False)

    op.drop_column("connector_credential_pair", "auto_sync_options")
    op.drop_column("connector_credential_pair", "access_type")
    op.drop_column("document", "external_user_emails")
    op.drop_column("document", "external_user_groups")
    op.drop_column("document", "public")
    op.drop_column("document", "last_time_perm_sync")
    op.drop_column("email_to_external_user_cache", "source_type")
    op.add_column(
        "external_permission",
        sa.Column("user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "email_to_external_user_cache",
        sa.Column("user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "permission_sync_run",
        sa.Column("cc_pair_id", sa.Integer(), nullable=True),
    )
    op.alter_column("permission_sync_run", "start_time", new_column_name="updated_at")

    # Drop the enum type at the end of the downgrade
    op.execute("DROP TYPE accesstype")
