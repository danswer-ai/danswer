"""add multiple slack apps

Revision ID: cf0be154a0d9
Revises: bc9771dccadf
Create Date: 2024-06-28 10:15:11.566964

"""
import logging
import json
from typing import cast
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session
from danswer.dynamic_configs.factory import get_dynamic_config_store
from danswer.danswerbot.slack.tokens import _SLACK_BOT_TOKENS_CONFIG_KEY

# revision identifiers, used by Alembic.
revision = "cf0be154a0d9"
down_revision = "bc9771dccadf"
branch_labels: None = None
depends_on: None = None

# Configure logging
logger = logging.getLogger('alembic.runtime.migration')
logger.setLevel(logging.INFO)

def upgrade() -> None:
    logger.info(f"Starting upgrade")

    logger.info(f"create_table: slack_app")
    op.create_table(
        "slack_app",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("bot_token", sa.String(), nullable=False),
        sa.Column("app_token", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    logger.info(f"add_column: slack_bot_config.app_id")
    op.add_column(
        "slack_bot_config",
        sa.Column("app_id", sa.Integer(), nullable=True),
    )

    try:
        tokens = cast(
            str, get_dynamic_config_store().load(_SLACK_BOT_TOKENS_CONFIG_KEY)
        )
        logger.info(f"tokens = {tokens}")

        bot_token = tokens["bot_token"]
        app_token = tokens["app_token"]

        if not bot_token:
            logger.info(f"bot_token not found")
            raise

        if not app_token:
            logger.info(f"app_token not found")
            raise

        logger.info(f"bot_token={bot_token} app_token={app_token}")

        # op.execute(
        #     f"INSERT INTO slack_app \
        #         (name, description, enabled, bot_token, app_token) VALUES \
        #             ('Slack App (Migrated)', 'Migrated app', TRUE, {bot_token}, {app_token})"
        # )

        op.execute(
            sa.text("INSERT INTO slack_app \
                        (name, description, enabled, bot_token, app_token) VALUES \
                        ('Slack App (Migrated)', 'Migrated app', TRUE, :bot_token, :app_token)")
                        .bindparams(bot_token=bot_token, app_token=app_token)
        )

        # Get the ID of the first row in the source_table
        first_row_id = op.get_bind().execute(
            sa.text("SELECT id FROM slack_app ORDER BY id LIMIT 1")
        ).scalar()

        logger.info(f"The ID of the first row is: {first_row_id}")

        # Update all rows in the slack_bot_config to set the foreign key app_id to first_row_id
        if first_row_id is not None:
            op.execute(
                sa.text("UPDATE slack_bot_config SET app_id = :first_row_id")
                .bindparams(first_row_id=first_row_id)
            )

        # We can leave the deletion for a later migration
        # Delete the dynamic config
        # get_dynamic_config_store().delete(_SLACK_BOT_TOKENS_CONFIG_KEY)

    except Exception as ex:
        # Ignore if the dynamic config is not found
        logger.info(f"Exception: {ex}")

    # op.alter_column('slack_bot_config', 'app_id', existing_type=sa.Integer(), nullable=False)

    sa.ForeignKeyConstraint(
        ["app_id"],
        ["slack_app.id"],
    ),

    logger.info(f"Upgrade complete")

def downgrade() -> None:
    op.drop_column("slack_bot_config", "app_id")
    op.drop_table("slack_app")
