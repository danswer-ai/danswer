"""Enable Encrypted Fields

Revision ID: 0a98909f2757
Revises: 570282d33c49
Create Date: 2024-05-05 19:30:34.317972

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table
from sqlalchemy.dialects import postgresql
import json

from danswer.utils.encryption import encrypt_string_to_bytes

# revision identifiers, used by Alembic.
revision = "0a98909f2757"
down_revision = "570282d33c49"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()

    op.alter_column("key_value_store", "value", nullable=True)
    op.add_column(
        "key_value_store",
        sa.Column(
            "encrypted_value",
            sa.LargeBinary,
            nullable=True,
        ),
    )

    # Need a temporary column to translate the JSONB to binary
    op.add_column("credential", sa.Column("temp_column", sa.LargeBinary()))

    creds_table = table(
        "credential",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "credential_json",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "temp_column",
            sa.LargeBinary(),
            nullable=False,
        ),
    )

    results = connection.execute(sa.select(creds_table))

    # This uses the MIT encrypt which does not actually encrypt the credentials
    # In other words, this upgrade does not apply the encryption. Porting existing sensitive data
    # and key rotation currently is not supported and will come out in the future
    for row_id, creds, _ in results:
        creds_binary = encrypt_string_to_bytes(json.dumps(creds))
        connection.execute(
            creds_table.update()
            .where(creds_table.c.id == row_id)
            .values(temp_column=creds_binary)
        )

    op.drop_column("credential", "credential_json")
    op.alter_column("credential", "temp_column", new_column_name="credential_json")


def downgrade() -> None:
    # Downgrades not supported, can be built in later if needed
    pass
