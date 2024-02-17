"""Embedding Models

Revision ID: dbaa756c2ccf
Revises: 7f726bad5367
Create Date: 2024-01-25 17:12:31.813160

"""
from alembic import op
import sqlalchemy as sa

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
