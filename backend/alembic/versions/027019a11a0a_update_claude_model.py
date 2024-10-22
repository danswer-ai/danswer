"""update_claude_model

Revision ID: 027019a11a0a
Revises: 1b10e1fda030
Create Date: 2024-10-22 15:24:17.405747

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "027019a11a0a"
down_revision = "1b10e1fda030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            "UPDATE llm_provider SET display_model_names = "
            "array_replace(display_model_names, 'claude-3-5-sonnet-20240620', "
            "'claude-3-5-sonnet-20241022') WHERE 'claude-3-5-sonnet-20240620' = "
            "ANY(display_model_names)"
        )
    )
    connection.execute(
        sa.text(
            "UPDATE llm_provider SET display_model_names = "
            "array_replace(display_model_names, 'anthropic.claude-3-5-sonnet-20240620-v1:0', "
            "'anthropic.claude-3-5-sonnet-20241022-v2:0') WHERE 'anthropic.claude-3-5-sonnet-20240620-v1:0' = "
            "ANY(display_model_names)"
        )
    )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            "UPDATE llm_provider SET display_model_names = "
            "array_replace(display_model_names, 'claude-3-5-sonnet-20241022', "
            "'claude-3-5-sonnet-20240620') WHERE 'claude-3-5-sonnet-20241022' = "
            "ANY(display_model_names)"
        )
    )
    connection.execute(
        sa.text(
            "UPDATE llm_provider SET display_model_names = "
            "array_replace(display_model_names, 'anthropic.claude-3-5-sonnet-20241022-v2:0', "
            "'anthropic.claude-3-5-sonnet-20240620-v1:0') WHERE 'anthropic.claude-3-5-sonnet-20241022-v2:0' = "
            "ANY(display_model_names)"
        )
    )
