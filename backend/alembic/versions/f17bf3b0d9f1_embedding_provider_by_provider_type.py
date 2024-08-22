"""embedding provider by provider type

Revision ID: f17bf3b0d9f1
Revises: 4b08d97e175a
Create Date: 2024-08-21 13:13:31.120460

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f17bf3b0d9f1"
down_revision = "4b08d97e175a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "embedding_provider",
        sa.Column("provider_type", sa.String(50), nullable=True),
    )

    # Update provider_type with existing name values
    op.execute("UPDATE embedding_provider SET provider_type = name")

    # Make provider_type not nullable
    op.alter_column("embedding_provider", "provider_type", nullable=False)

    # Drop the foreign key constraint in embedding_model table
    op.drop_constraint(
        "fk_embedding_model_cloud_provider", "embedding_model", type_="foreignkey"
    )

    # Drop the existing primary key constraint
    op.drop_constraint("embedding_provider_pkey", "embedding_provider", type_="primary")

    # Create a new primary key constraint on provider_type
    op.create_primary_key(
        "embedding_provider_pkey", "embedding_provider", ["provider_type"]
    )

    # Drop the old id column
    op.drop_column("embedding_provider", "id")

    # Drop the name column
    op.drop_column("embedding_provider", "name")

    # Changes to embedding_model table
    op.add_column(
        "embedding_model",
        sa.Column("provider_type", sa.String(50), nullable=True),
    )

    # Drop the old cloud_provider_id column
    op.drop_column("embedding_model", "cloud_provider_id")

    # Create the new foreign key constraint
    op.create_foreign_key(
        "fk_embedding_model_cloud_provider",
        "embedding_model",
        "embedding_provider",
        ["provider_type"],
        ["provider_type"],
    )


def downgrade() -> None:
    # Revert changes to embedding_model table
    op.drop_constraint(
        "fk_embedding_model_cloud_provider", "embedding_model", type_="foreignkey"
    )

    # Add id column back to embedding_provider table
    op.add_column(
        "embedding_provider",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
    )

    # Set id values for existing rows in embedding_provider
    op.execute("CREATE SEQUENCE embedding_provider_id_seq")
    op.execute(
        "UPDATE embedding_provider SET id = nextval('embedding_provider_id_seq')"
    )
    op.execute(
        "ALTER TABLE embedding_provider ALTER COLUMN id SET DEFAULT nextval('embedding_provider_id_seq')"
    )

    # Add name column to embedding_provider table
    op.add_column("embedding_provider", sa.Column("name", sa.String(50), nullable=True))
    op.execute("UPDATE embedding_provider SET name = provider_type")

    # Create a unique constraint on the id column
    op.create_unique_constraint(
        "uq_embedding_provider_id", "embedding_provider", ["id"]
    )

    # Create a unique constraint on the name column
    op.create_unique_constraint(
        "uq_embedding_provider_name", "embedding_provider", ["name"]
    )

    # Add cloud_provider_id column to embedding_model
    op.add_column(
        "embedding_model", sa.Column("cloud_provider_id", sa.Integer(), nullable=True)
    )

    # Update cloud_provider_id in embedding_model
    op.execute(
        """
        UPDATE embedding_model
        SET cloud_provider_id = embedding_provider.id
        FROM embedding_provider
        WHERE embedding_model.provider_type = embedding_provider.provider_type
        """
    )

    # Drop the provider_type column from embedding_model
    op.drop_column("embedding_model", "provider_type")

    # Recreate the foreign key constraint
    op.create_foreign_key(
        "fk_embedding_model_cloud_provider",
        "embedding_model",
        "embedding_provider",
        ["cloud_provider_id"],
        ["id"],
    )

    # Revert changes to embedding_provider table
    op.drop_constraint("embedding_provider_pkey", "embedding_provider", type_="primary")
    op.create_primary_key("embedding_provider_pkey", "embedding_provider", ["id"])
    op.alter_column("embedding_provider", "name", nullable=False)
    op.drop_column("embedding_provider", "provider_type")
