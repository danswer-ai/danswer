"""Default Embedding Model

Revision ID: 581b2a73584b
Revises: dbaa756c2ccf
Create Date: 2024-01-28 18:16:39.236615

"""
from alembic import op
from danswer.configs.model_configs import DOCUMENT_ENCODER_MODEL
from danswer.configs.model_configs import (
    DOC_EMBEDDING_DIM,
    NORMALIZE_EMBEDDINGS,
    ASYM_QUERY_PREFIX,
    ASYM_PASSAGE_PREFIX,
)
from danswer.db.models import IndexModelStatus
from sqlalchemy import table, column, String, Integer, Boolean
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "581b2a73584b"
down_revision = "dbaa756c2ccf"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "embedding_model", sa.Column("index_name", sa.String(), nullable=False)
    )
    EmbeddingModel = table(
        "embedding_model",
        column("id", Integer),
        column("model_name", String),
        column("model_dim", Integer),
        column("normalize", Boolean),
        column("query_prefix", String),
        column("passage_prefix", String),
        column("status", sa.Enum(IndexModelStatus, name="indexmodelstatus")),
        column("index_name", String),
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
                "status": IndexModelStatus.PRESENT,
                "index_name": "danswer_chunk",
            }
        ],
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


def downgrade() -> None:
    op.alter_column(
        "index_attempt", "embedding_model_id", existing_type=sa.Integer(), nullable=True
    )
    op.drop_column("embedding_model", "index_name")
