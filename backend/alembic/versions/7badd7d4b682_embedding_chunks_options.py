"""embedding chunks options

Revision ID: 7badd7d4b682
Revises: bc9771dccadf
Create Date: 2024-06-25 15:57:46.707328

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "7badd7d4b682"
down_revision = "bc9771dccadf"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("connector", sa.Column("embedding_size", sa.Integer, nullable=True))
    op.add_column("connector", sa.Column("chunk_overlap", sa.Integer, nullable=True))

    op.execute("UPDATE connector SET embedding_size = 512, chunk_overlap = 0")

    op.alter_column("connector", "embedding_size", nullable=False)
    op.alter_column("connector", "chunk_overlap", nullable=False)

    op.create_check_constraint(
        "check_embedding_size_positive", "connector", "embedding_size > 0"
    )
    op.create_check_constraint(
        "check_chunk_overlap_positive", "connector", "chunk_overlap >= 0"
    )


def downgrade() -> None:
    op.drop_constraint("check_embedding_size_positive", "connector", type_="check")
    op.drop_constraint("check_chunk_overlap_positive", "connector", type_="check")

    op.drop_column("connector", "embedding_size")
    op.drop_column("connector", "chunk_overlap")
