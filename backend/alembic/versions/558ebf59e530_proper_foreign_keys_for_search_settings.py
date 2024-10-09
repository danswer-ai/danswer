"""proper foreign keys for search settings

Revision ID: 558ebf59e530
Revises: 5d12a446f5c0
Create Date: 2024-10-09 12:59:05.763187

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import Enum
from sqlalchemy.inspection import inspect


# revision identifiers, used by Alembic.
revision = "558ebf59e530"
down_revision = "5d12a446f5c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add id column as nullable
    op.add_column("embedding_provider", sa.Column("id", sa.Integer(), nullable=True))
    op.execute("CREATE SEQUENCE IF NOT EXISTS embedding_provider_id_seq")

    # Backfill id values for existing rows
    op.execute(
        """
        UPDATE embedding_provider
        SET id = nextval('embedding_provider_id_seq')
    """
    )

    # Alter id column to set NOT NULL constraint
    op.alter_column("embedding_provider", "id", nullable=False)

    # Drop existing primary key on provider_type
    # Drop the foreign key constraint in search_settings first
    op.drop_constraint(
        "fk_embedding_model_cloud_provider", "search_settings", type_="foreignkey"
    )

    # Now we can safely drop the primary key constraint
    op.drop_constraint("embedding_provider_pkey", "embedding_provider", type_="primary")

    # Create primary key on id column
    op.create_primary_key("pk_embedding_provider", "embedding_provider", ["id"])
    op.execute(
        """
        ALTER TABLE embedding_provider ALTER COLUMN id SET DEFAULT nextval('embedding_provider_id_seq')
    """
    )

    # Add cloud_provider_id column
    op.add_column(
        "search_settings", sa.Column("cloud_provider_id", sa.Integer(), nullable=True)
    )

    # Update cloud_provider_id based on provider_type
    op.execute(
        """
        UPDATE search_settings
        SET cloud_provider_id = ep.id
        FROM embedding_provider ep
        WHERE search_settings.provider_type = ep.provider_type
    """
    )

    # Create new foreign key constraint
    op.create_foreign_key(
        "fk_search_settings_cloud_provider",
        "search_settings",
        "embedding_provider",
        ["cloud_provider_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Drop the old foreign key and provider_type column
    op.drop_column("search_settings", "provider_type")


def downgrade() -> None:
    # Create the Enum type first
    embedding_provider_enum = Enum("embeddingprovider", name="embeddingprovider")
    embedding_provider_enum.create(op.get_bind(), checkfirst=True)

    # Check if provider_type column exists
    inspector = inspect(op.get_bind())
    columns = [col["name"] for col in inspector.get_columns("search_settings")]

    if "provider_type" not in columns:
        # Add back provider_type column only if it doesn't exist
        op.add_column(
            "search_settings",
            sa.Column("provider_type", embedding_provider_enum, nullable=True),
        )

    # Restore provider_type values with casting
    op.execute(
        """
        UPDATE search_settings
        SET provider_type = ep.provider_type::embeddingprovider
        FROM embedding_provider ep
        WHERE search_settings.cloud_provider_id = ep.id
    """
    )

    # Recreate old foreign key (if it doesn't exist)

    op.create_foreign_key(
        "fk_search_settings_provider_type",
        "search_settings",
        "embedding_provider",
        ["provider_type"],
        ["provider_type"],
    )

    # Drop new foreign key and column
    op.drop_constraint(
        "fk_search_settings_cloud_provider", "search_settings", type_="foreignkey"
    )
    op.drop_column("search_settings", "cloud_provider_id")

    # Remove id column from embedding_provider and recreate primary key
    op.drop_constraint("pk_embedding_provider", "embedding_provider", type_="primary")
    op.drop_column("embedding_provider", "id")
    op.execute("DROP SEQUENCE IF EXISTS embedding_provider_id_seq")

    # Recreate primary key on provider_type
    op.create_primary_key(
        "embedding_provider_pkey", "embedding_provider", ["provider_type"]
    )

    # Don't drop the Enum type, as it might be used elsewhere
