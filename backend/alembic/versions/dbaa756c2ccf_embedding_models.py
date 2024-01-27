"""Embedding Models

Revision ID: dbaa756c2ccf
Revises: 7f726bad5367
Create Date: 2024-01-25 17:12:31.813160

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import table, column, String, Integer, Boolean

from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import DOC_EMBEDDING_DIM
from danswer.configs.model_configs import NORMALIZE_EMBEDDINGS
from danswer.configs.model_configs import ASYM_QUERY_PREFIX
from danswer.configs.model_configs import ASYM_PASSAGE_PREFIX
from danswer.db.models import IndexModelStatus

# revision identifiers, used by Alembic.
revision = "dbaa756c2ccf"
down_revision = "7f726bad5367"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "embedding_model",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("model_name", sa.String(), nullable=False),
        sa.Column("model_dim", sa.Integer(), nullable=False),
        sa.Column("normalize", sa.Boolean(), nullable=False),
        sa.Column("query_prefix", sa.String(), nullable=False),
        sa.Column("passage_prefix", sa.String(), nullable=False),
        sa.Column("index_name", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(IndexModelStatus, native=False),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    EmbeddingModel = table(
        "embedding_model",
        column("id", Integer),
        column("model_name", String),
        column("model_dim", Integer),
        column("normalize", Boolean),
        column("query_prefix", String),
        column("passage_prefix", String),
        column("index_name", String),
        column(
            "status", sa.Enum(IndexModelStatus, name="indexmodelstatus", native=False)
        ),
    )
    op.bulk_insert(
        EmbeddingModel,
        [
            {
                "model_name": DOCUMENT_ENCODER_MODEL,
                "model_dim": DOC_EMBEDDING_DIM,
                "normalize": NORMALIZE_EMBEDDINGS,
                "query_prefix": ASYM_QUERY_PREFIX,
                "passage_prefix": ASYM_PASSAGE_PREFIX,
                "index_name": "danswer_chunk",
                "status": IndexModelStatus.PRESENT,
            }
        ],
    )
    op.add_column(
        "index_attempt",
        sa.Column("embedding_model_id", sa.Integer(), nullable=True),
    )
    op.execute(
        "UPDATE index_attempt SET embedding_model_id=1 WHERE embedding_model_id IS NULL"
    )
    op.alter_column(
        "index_attempt",
        "embedding_model_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.create_foreign_key(
        "index_attempt__embedding_model_fk",
        "index_attempt",
        "embedding_model",
        ["embedding_model_id"],
        ["id"],
    )
    op.create_index(
        "ix_embedding_model_present_unique",
        "embedding_model",
        ["status"],
        unique=True,
        postgresql_where=sa.text("status = 'PRESENT'"),
    )
    op.create_index(
        "ix_embedding_model_future_unique",
        "embedding_model",
        ["status"],
        unique=True,
        postgresql_where=sa.text("status = 'FUTURE'"),
    )


def downgrade() -> None:
    op.drop_constraint(
        "index_attempt__embedding_model_fk", "index_attempt", type_="foreignkey"
    )
    op.drop_column("index_attempt", "embedding_model_id")
    op.drop_table("embedding_model")
    op.execute("DROP TYPE indexmodelstatus;")
