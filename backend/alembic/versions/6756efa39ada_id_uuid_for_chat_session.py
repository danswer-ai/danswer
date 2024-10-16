"""id -> uuid for chat session

Revision ID: 6756efa39ada
Revises: 5d12a446f5c0
Create Date: 2024-10-15 17:47:44.108537

"""
from alembic import op
import sqlalchemy as sa
import uuid

revision = "6756efa39ada"
down_revision = "5d12a446f5c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "chat_session",
        sa.Column("new_id", sa.UUID(as_uuid=True), default=uuid.uuid4, nullable=True),
    )

    conn = op.get_bind()
    chat_session_table = sa.Table(
        "chat_session",
        sa.MetaData(),
        sa.Column("id", sa.Integer),
        sa.Column("new_id", sa.UUID),
    )

    result = conn.execute(sa.select(chat_session_table.c.id))
    id_mapping = {}
    for row in result.fetchall():
        old_id = row.id
        new_uuid = uuid.uuid4()
        id_mapping[old_id] = new_uuid
        conn.execute(
            chat_session_table.update()
            .where(chat_session_table.c.id == old_id)
            .values(new_id=new_uuid)
        )

    op.add_column(
        "chat_message",
        sa.Column("new_chat_session_id", sa.UUID(as_uuid=True), nullable=True),
    )

    chat_table = sa.Table(
        "chat_message",
        sa.MetaData(),
        sa.Column("chat_session_id", sa.Integer),
        sa.Column("new_chat_session_id", sa.UUID),
    )

    for old_id, new_uuid in id_mapping.items():
        conn.execute(
            chat_table.update()
            .where(chat_table.c.chat_session_id == old_id)
            .values(new_chat_session_id=new_uuid)
        )

    op.drop_column("chat_message", "chat_session_id")
    op.alter_column(
        "chat_message", "new_chat_session_id", new_column_name="chat_session_id"
    )

    op.drop_constraint("chat_session_pkey", "chat_session", type_="primary")
    op.drop_column("chat_session", "id")

    op.alter_column("chat_session", "new_id", new_column_name="id")
    op.create_primary_key("chat_session_pkey", "chat_session", ["id"])
    op.create_foreign_key(
        "chat_message_chat_session_id_fkey",
        "chat_message",
        "chat_session",
        ["chat_session_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.add_column(
        "chat_session",
        sa.Column("old_id", sa.Integer, autoincrement=True, nullable=False),
    )

    conn = op.get_bind()
    chat_session_table = sa.Table(
        "chat_session",
        sa.MetaData(),
        sa.Column("id", sa.UUID),
        sa.Column("old_id", sa.Integer),
    )

    conn.execute(
        sa.text("CREATE SEQUENCE chat_session_old_id_seq OWNED BY chat_session.old_id")
    )
    conn.execute(
        chat_session_table.update().values(
            old_id=sa.text("nextval('chat_session_old_id_seq')")
        )
    )

    op.add_column(
        "chat_message", sa.Column("old_chat_session_id", sa.Integer, nullable=True)
    )

    chat_table = sa.Table(
        "chat_message",
        sa.MetaData(),
        sa.Column("chat_session_id", sa.UUID),
        sa.Column("old_chat_session_id", sa.Integer),
    )

    result = conn.execute(sa.select([chat_session_table.c.id, chat_session_table.c.old_id]))  # type: ignore
    uuid_to_old_id = {row.id: row.old_id for row in result.fetchall()}

    for uuid_id, old_id in uuid_to_old_id.items():
        conn.execute(
            chat_table.update()
            .where(chat_table.c.chat_session_id == uuid_id)
            .values(old_chat_session_id=old_id)
        )

    op.drop_constraint(
        "chat_message_chat_session_id_fkey", "chat_message", type_="foreignkey"
    )
    op.drop_column("chat_message", "chat_session_id")
    op.alter_column(
        "chat_message", "old_chat_session_id", new_column_name="chat_session_id"
    )

    op.create_foreign_key(
        "chat_message_chat_session_id_fkey",
        "chat_message",
        "chat_session",
        ["chat_session_id"],
        ["old_id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("chat_session_pkey", "chat_session", type_="primary")
    op.drop_column("chat_session", "id")
    op.alter_column("chat_session", "old_id", new_column_name="id")
    op.create_primary_key("chat_session_pkey", "chat_session", ["id"])

    conn.execute(sa.text("DROP SEQUENCE IF EXISTS chat_session_old_id_seq"))
