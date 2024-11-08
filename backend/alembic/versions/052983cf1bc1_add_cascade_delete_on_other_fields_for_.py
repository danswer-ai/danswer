"""add cascade delete on other fields for user deletion

Revision ID: 052983cf1bc1
Revises: 5d10c5647eca
Create Date: 2024-11-08 17:16:01.901105

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "052983cf1bc1"
down_revision = "5d10c5647eca"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_foreign_key(
        None, "api_key", "user", ["user_id"], ["id"], ondelete="CASCADE"
    )
    op.create_foreign_key(None, "api_key", "user", ["owner_id"], ["id"])
    op.drop_constraint("assistant__user_fk", "assistant", type_="foreignkey")
    op.create_foreign_key(
        None, "assistant", "user", ["user_id"], ["id"], ondelete="CASCADE"
    )
    op.drop_constraint(
        "assistant__user_user_id_fkey", "assistant__user", type_="foreignkey"
    )
    op.create_foreign_key(
        None,
        "assistant__user",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint("document_set_user_id_fkey", "document_set", type_="foreignkey")
    op.create_foreign_key(
        None, "document_set", "user", ["user_id"], ["id"], ondelete="CASCADE"
    )
    op.drop_constraint(
        "document_set__user_user_id_fkey",
        "document_set__user",
        type_="foreignkey",
    )
    op.create_foreign_key(
        None,
        "document_set__user",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint(
        "inputprompt__user_user_id_fkey",
        "inputprompt__user",
        type_="foreignkey",
    )
    op.create_foreign_key(
        None,
        "inputprompt__user",
        "inputprompt",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint("saml_user_id_fkey", "saml", type_="foreignkey")
    op.create_foreign_key(None, "saml", "user", ["user_id"], ["id"], ondelete="CASCADE")
    op.drop_constraint("standard_answer_keyword_key", "standard_answer", type_="unique")
    op.create_index(
        "unique_keyword_active",
        "standard_answer",
        ["keyword", "active"],
        unique=True,
        postgresql_where=sa.text("active = true"),
    )
    op.create_foreign_key(
        None, "teamspace", "user", ["creator_id"], ["id"], ondelete="CASCADE"
    )
    op.drop_constraint("tool_user_fk", "tool", type_="foreignkey")
    op.create_foreign_key(None, "tool", "user", ["user_id"], ["id"], ondelete="CASCADE")
    op.drop_constraint(
        "usage_reports_requestor_user_id_fkey",
        "usage_reports",
        type_="foreignkey",
    )
    op.create_foreign_key(
        None,
        "usage_reports",
        "user",
        ["requestor_user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        None,
        "user__external_teamspace_id",
        "connector_credential_pair",
        ["cc_pair_id"],
        ["id"],
    )
    op.create_foreign_key(
        None,
        "user__external_teamspace_id",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint(
        "user__teamspace_user_id_fkey", "user__teamspace", type_="foreignkey"
    )
    op.create_foreign_key(
        None,
        "user__teamspace",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_constraint(
        "workspace__users_user_id_fkey", "workspace__users", type_="foreignkey"
    )
    op.create_foreign_key(
        None,
        "workspace__users",
        "user",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, "workspace__users", type_="foreignkey")
    op.create_foreign_key(
        "workspace__users_user_id_fkey",
        "workspace__users",
        "user",
        ["user_id"],
        ["id"],
    )
    op.drop_constraint(None, "user__teamspace", type_="foreignkey")
    op.create_foreign_key(
        "user__teamspace_user_id_fkey",
        "user__teamspace",
        "user",
        ["user_id"],
        ["id"],
    )
    op.drop_constraint(None, "user__external_teamspace_id", type_="foreignkey")
    op.drop_constraint(None, "user__external_teamspace_id", type_="foreignkey")
    op.drop_constraint(None, "usage_reports", type_="foreignkey")
    op.create_foreign_key(
        "usage_reports_requestor_user_id_fkey",
        "usage_reports",
        "user",
        ["requestor_user_id"],
        ["id"],
    )
    op.drop_constraint(None, "tool", type_="foreignkey")
    op.create_foreign_key("tool_user_fk", "tool", "user", ["user_id"], ["id"])
    op.drop_constraint(None, "teamspace", type_="foreignkey")
    op.drop_constraint(None, "saml", type_="foreignkey")
    op.create_foreign_key("saml_user_id_fkey", "saml", "user", ["user_id"], ["id"])
    op.drop_constraint(None, "inputprompt__user", type_="foreignkey")
    op.create_foreign_key(
        "inputprompt__user_user_id_fkey",
        "inputprompt__user",
        "inputprompt",
        ["user_id"],
        ["id"],
    )
    op.drop_constraint(None, "document_set__user", type_="foreignkey")
    op.create_foreign_key(
        "document_set__user_user_id_fkey",
        "document_set__user",
        "user",
        ["user_id"],
        ["id"],
    )
    op.drop_constraint(None, "document_set", type_="foreignkey")
    op.create_foreign_key(
        "document_set_user_id_fkey",
        "document_set",
        "user",
        ["user_id"],
        ["id"],
    )
    op.create_unique_constraint("chat_message_id_key", "chat_message", ["id"])
    op.drop_constraint(None, "assistant__user", type_="foreignkey")
    op.create_foreign_key(
        "assistant__user_user_id_fkey",
        "assistant__user",
        "user",
        ["user_id"],
        ["id"],
    )
    op.drop_constraint(None, "assistant", type_="foreignkey")
    op.create_foreign_key(
        "assistant__user_fk", "assistant", "user", ["user_id"], ["id"]
    )
    op.drop_constraint(None, "api_key", type_="foreignkey")
    op.drop_constraint(None, "api_key", type_="foreignkey")
    # ### end Alembic commands ###
