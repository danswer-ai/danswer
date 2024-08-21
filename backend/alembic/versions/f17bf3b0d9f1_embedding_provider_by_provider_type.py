"""embedding provider by provider type

Revision ID: f17bf3b0d9f1
Revises: 4b08d97e175a
Create Date: 2024-08-21 13:13:31.120460

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "f17bf3b0d9f1"
down_revision = "4b08d97e175a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the EmbeddingProvider enum type
    op.execute(
        "CREATE TYPE embeddingprovider AS ENUM ('OPENAI', 'AZURE', 'COHERE', 'HUGGINGFACE', 'GOOGLE', 'BEDROCK')"
    )

    # Add the new provider_type column to embedding_provider
    op.add_column(
        "embedding_provider",
        sa.Column(
            "provider_type",
            postgresql.ENUM(
                "OPENAI",
                "AZURE",
                "COHERE",
                "HUGGINGFACE",
                "GOOGLE",
                "BEDROCK",
                name="embeddingprovider",
            ),
            nullable=True,
        ),
    )

    # Copy data from 'name' to 'provider_type'
    op.execute("UPDATE embedding_provider SET provider_type = name::embeddingprovider")

    # Drop the foreign key constraint in embedding_model
    op.drop_constraint(
        "fk_embedding_model_cloud_provider", "embedding_model", type_="foreignkey"
    )

    # Rename cloud_provider_id to cloud_provider_type in embedding_model
    op.alter_column(
        "embedding_model",
        "cloud_provider_id",
        new_column_name="cloud_provider_type",
        type_=postgresql.ENUM(
            "OPENAI",
            "AZURE",
            "COHERE",
            "HUGGINGFACE",
            "GOOGLE",
            "BEDROCK",
            name="embeddingprovider",
        ),
    )

    # Drop the old primary key and id column from embedding_provider
    op.drop_constraint("embedding_provider_pkey", "embedding_provider", type_="primary")
    op.drop_column("embedding_provider", "id")

    # Make 'provider_type' not nullable and set it as the new primary key
    op.alter_column("embedding_provider", "cloud_provider_type", nullable=False)
    op.create_primary_key(
        "embedding_provider_pkey", "embedding_provider", ["cloud_provider_type"]
    )

    # Drop the 'name' column from embedding_provider
    op.drop_column("embedding_provider", "name")

    # Update the foreign key in embedding_model
    op.create_foreign_key(
        "fk_embedding_model_cloud_provider",
        "embedding_model",
        "embedding_provider",
        ["cloud_provider_type"],
        ["provider_type"],
    )


def downgrade() -> None:
    # Add back the 'id' and 'name' columns to embedding_provider
    op.add_column(
        "embedding_provider",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
    )
    op.add_column("embedding_provider", sa.Column("name", sa.String(), nullable=True))

    # Copy data from 'provider_type' to 'name'
    op.execute("UPDATE embedding_provider SET name = provider_type::text")

    # Drop the new primary key
    op.drop_constraint("embedding_provider_pkey", "embedding_provider", type_="primary")

    # Set 'id' as the primary key
    op.create_primary_key("embedding_provider_pkey", "embedding_provider", ["id"])

    # Make 'name' unique and not nullable
    op.create_unique_constraint(
        "embedding_provider_name_key", "embedding_provider", ["name"]
    )
    op.alter_column("embedding_provider", "name", nullable=False)

    # Rename cloud_provider_type back to cloud_provider_id in embedding_model
    op.alter_column(
        "embedding_model",
        "cloud_provider_type",
        new_column_name="cloud_provider_id",
        type_=sa.Integer(),
    )

    # Drop the 'provider_type' column from embedding_provider
    op.drop_column("embedding_provider", "provider_type")

    # Drop the EmbeddingProvider enum type
    op.execute("DROP TYPE embeddingprovider")

    # Update the foreign key in embedding_model
    op.drop_constraint(
        "fk_embedding_model_cloud_provider", "embedding_model", type_="foreignkey"
    )
    op.create_foreign_key(
        "fk_embedding_model_cloud_provider",
        "embedding_model",
        "embedding_provider",
        ["cloud_provider_id"],
        ["id"],
    )
