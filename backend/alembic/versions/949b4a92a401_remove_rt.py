"""remove rt

Revision ID: 949b4a92a401
Revises: 1b10e1fda030
Create Date: 2024-10-26 13:06:06.937969

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "949b4a92a401"
down_revision = "1b10e1fda030"
branch_labels = None
depends_on = None


def upgrade():
    # Delete ConnectorCredentialPair entries associated with 'REQUEST_TRACKER' connectors
    op.execute(
        """
        DELETE FROM connector_credential_pair
        WHERE connector_id IN (
            SELECT id FROM connector WHERE source = 'REQUEST_TRACKER'
        )
    """
    )

    # Delete 'REQUEST_TRACKER' connectors
    op.execute(
        """
        DELETE FROM connector
        WHERE source = 'REQUEST_TRACKER'
    """
    )


def downgrade():
    # No action needed for downgrade
    pass
