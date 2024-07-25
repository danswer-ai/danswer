"""Add icon_color and icon_shape to Persona

Revision ID: 325975216eb3
Revises: 91ffac7e65b3
Create Date: 2024-07-24 21:29:31.784562

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "325975216eb3"
down_revision = "91ffac7e65b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("persona", sa.Column("icon_color", sa.String(), nullable=True))
    op.add_column("persona", sa.Column("icon_shape", sa.Integer(), nullable=True))
    op.add_column("persona", sa.Column("uploaded_image_id", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("persona", "icon_shape")
    op.drop_column("persona", "uploaded_image_id")
    op.drop_column("persona", "icon_color")
