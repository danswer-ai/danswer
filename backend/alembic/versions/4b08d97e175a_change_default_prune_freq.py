"""change default prune_freq

Revision ID: 4b08d97e175a
Revises: da4c21c69164
Create Date: 2024-08-20 15:28:52.993827

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "4b08d97e175a"
down_revision = "da4c21c69164"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE connector
        SET prune_freq = 2592000
        WHERE prune_freq = 86400
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE connector
        SET prune_freq = 86400
        WHERE prune_freq = 2592000
        """
    )
