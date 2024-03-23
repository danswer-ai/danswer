"""Remove Remaining Enums

Revision ID: 776b3bbe9092
Revises: 4738e4b3bae1
Create Date: 2024-03-22 21:34:27.629444

"""
from alembic import op
import sqlalchemy as sa

from danswer.db.models import IndexModelStatus
from danswer.search.models import RecencyBiasSetting
from danswer.search.models import SearchType

# revision identifiers, used by Alembic.
revision = "776b3bbe9092"
down_revision = "4738e4b3bae1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "persona",
        "search_type",
        type_=sa.String(length=50),
        existing_type=sa.Enum(SearchType, native_enum=False),
        existing_nullable=False,
    )
    op.alter_column(
        "persona",
        "recency_bias",
        type_=sa.String(length=50),
        existing_type=sa.Enum(RecencyBiasSetting, native_enum=False),
        existing_nullable=False,
    )
    op.alter_column(
        "embedding_model",
        "status",
        type_=sa.String(length=50),
        existing_type=sa.Enum(IndexModelStatus, native_enum=False),
        existing_nullable=False,
    )
    op.execute("DROP TYPE IF EXISTS SearchType")
    op.execute("DROP TYPE IF EXISTS RecencyBiasSetting")
    op.execute("DROP TYPE IF EXISTS IndexModelStatus")


def downgrade() -> None:
    op.alter_column(
        "persona",
        "search_type",
        type_=sa.Enum(SearchType, native_enum=False),
        existing_type=sa.String(length=50),
        existing_nullable=False,
    )
    op.alter_column(
        "persona",
        "recency_bias",
        type_=sa.Enum(RecencyBiasSetting, native_enum=False),
        existing_type=sa.String(length=50),
        existing_nullable=False,
    )
    op.alter_column(
        "embedding_model",
        "status",
        type_=sa.Enum(IndexModelStatus, native_enum=False),
        existing_type=sa.String(length=50),
        existing_nullable=False,
    )
