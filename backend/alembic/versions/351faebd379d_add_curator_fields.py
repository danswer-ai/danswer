"""Add credential__teamspace table

Revision ID: 351faebd379d
Revises: ee3f4b47fad5
Create Date: 2024-08-15 22:37:08.397052

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "351faebd379d"
down_revision = "ee3f4b47fad5"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    # Create the association table
    op.create_table(
        "credential__teamspace",
        sa.Column("credential_id", sa.Integer(), nullable=False),
        sa.Column("teamspace_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["credential_id"],
            ["credential.id"],
        ),
        sa.ForeignKeyConstraint(
            ["teamspace_id"],
            ["teamspace.id"],
        ),
        sa.PrimaryKeyConstraint("credential_id", "teamspace_id"),
    )


def downgrade() -> None:
    # Drop the association table
    op.drop_table("credential__teamspace")
