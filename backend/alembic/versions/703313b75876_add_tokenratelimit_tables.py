"""Add TokenRateLimit Tables

Revision ID: 703313b75876
Revises: fad14119fb92
Create Date: 2024-04-15 01:36:02.952809

"""
import json
from typing import cast
from alembic import op
import sqlalchemy as sa
from enmedd.dynamic_configs.factory import get_dynamic_config_store

# revision identifiers, used by Alembic.
revision = "703313b75876"
down_revision = "fad14119fb92"
branch_labels: None = None
depends_on: None = None


def upgrade() -> None:
    op.create_table(
        "token_rate_limit",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("token_budget", sa.Integer(), nullable=False),
        sa.Column("period_hours", sa.Integer(), nullable=False),
        sa.Column(
            "scope",
            sa.String(length=10),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "token_rate_limit__teamspace",
        sa.Column("rate_limit_id", sa.Integer(), nullable=False),
        sa.Column("teamspace_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["rate_limit_id"],
            ["token_rate_limit.id"],
        ),
        sa.ForeignKeyConstraint(
            ["teamspace_id"],
            ["teamspace.id"],
        ),
        sa.PrimaryKeyConstraint("rate_limit_id", "teamspace_id"),
    )

    try:
        settings_json = cast(
            str, get_dynamic_config_store().load("token_budget_settings")
        )
        settings = json.loads(settings_json)

        is_enabled = settings.get("enable_token_budget", False)
        token_budget = settings.get("token_budget", -1)
        period_hours = settings.get("period_hours", -1)

        if is_enabled and token_budget > 0 and period_hours > 0:
            op.execute(
                f"INSERT INTO token_rate_limit \
                    (enabled, token_budget, period_hours, scope) VALUES \
                        ({is_enabled}, {token_budget}, {period_hours}, 'GLOBAL')"
            )

        # Delete the dynamic config
        get_dynamic_config_store().delete("token_budget_settings")

    except Exception:
        # Ignore if the dynamic config is not found
        pass


def downgrade() -> None:
    op.drop_table("token_rate_limit__teamspace")
    op.drop_table("token_rate_limit")
