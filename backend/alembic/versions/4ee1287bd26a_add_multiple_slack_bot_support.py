"""add_multiple_slack_bot_support

Revision ID: 4ee1287bd26a
Revises: 9cf5c00f72fe
Create Date: 2024-11-06 13:15:53.302644

"""
import logging
from typing import cast
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from danswer.key_value_store.factory import get_kv_store
from danswer.db.models import SlackBot
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "4ee1287bd26a"
down_revision = "9cf5c00f72fe"
branch_labels: None = None
depends_on: None = None

# Configure logging
logger = logging.getLogger("alembic.runtime.migration")
logger.setLevel(logging.INFO)


def upgrade() -> None:
    logger.info(f"{revision}: create_table: slack_bot")
    # Create new slack_bot table
    op.create_table(
        "slack_bot",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("bot_token", sa.LargeBinary(), nullable=False),
        sa.Column("app_token", sa.LargeBinary(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("bot_token"),
        sa.UniqueConstraint("app_token"),
    )

    # Create new slack_channel_config table
    op.create_table(
        "slack_channel_config",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("app_id", sa.Integer(), nullable=True),
        sa.Column("persona_id", sa.Integer(), nullable=True),
        sa.Column("channel_config", postgresql.JSONB(), nullable=False),
        sa.Column("response_type", sa.String(), nullable=False),
        sa.Column(
            "enable_auto_filters", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.ForeignKeyConstraint(
            ["app_id"],
            ["slack_bot.id"],
        ),
        sa.ForeignKeyConstraint(
            ["persona_id"],
            ["persona.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create association table
    op.create_table(
        "slack_bot__slack_channel_config",
        sa.Column("slack_bot_id", sa.Integer(), nullable=False),
        sa.Column("slack_bot_config_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["slack_bot_id"],
            ["slack_bot.id"],
        ),
        sa.ForeignKeyConstraint(
            ["slack_bot_config_id"],
            ["slack_channel_config.id"],
        ),
        sa.PrimaryKeyConstraint("slack_bot_id", "slack_bot_config_id"),
    )

    # Handle existing Slack bot tokens first
    logger.info(f"{revision}: Checking for existing Slack bot.")
    bot_token = None
    app_token = None
    first_row_id = None

    try:
        tokens = cast(dict, get_kv_store().load("slack_bot_tokens_config_key"))
        bot_token = tokens.get("bot_token")
        app_token = tokens.get("app_token")

        if bot_token and app_token:
            logger.info(f"{revision}: Found bot and app tokens.")

            session = Session(bind=op.get_bind())
            try:
                new_slack_bot = SlackBot(
                    name="Slack App (Migrated)",
                    description="Migrated app",
                    enabled=True,
                    bot_token=bot_token,
                    app_token=app_token,
                )
                session.add(new_slack_bot)
                session.commit()
                first_row_id = new_slack_bot.id
            except Exception:
                session.rollback()
                logger.warning("rolling back slack bot creation")
                raise
            finally:
                session.close()
    except Exception as ex:
        logger.debug(f"{revision}: Exception while handling tokens: {ex}")
        logger.info(f"{revision}: This is OK if there was not an existing Slack bot.")

    # Copy data from old table to new tables
    op.execute(
        """
        WITH inserted_bot AS (
            INSERT INTO slack_bot (name, enabled, bot_token, app_token)
            SELECT 'Default Bot', true, '', ''
            WHERE NOT EXISTS (SELECT 1 FROM slack_bot)
            RETURNING id
        ),
        default_bot_id AS (
            SELECT COALESCE(
                :first_row_id,
                (SELECT id FROM inserted_bot),
                (SELECT id FROM slack_bot LIMIT 1)
            ) as bot_id
        ),
        channel_names AS (
            SELECT
                sbc.id as config_id,
                sbc.persona_id,
                sbc.response_type,
                sbc.enable_auto_filters,
                jsonb_array_elements_text(sbc.channel_config->'channel_names') as channel_name,
                sbc.channel_config->>'respond_tag_only' as respond_tag_only,
                sbc.channel_config->>'respond_to_bots' as respond_to_bots,
                sbc.channel_config->'respond_member_group_list' as respond_member_group_list,
                sbc.channel_config->'answer_filters' as answer_filters,
                sbc.channel_config->'follow_up_tags' as follow_up_tags
            FROM slack_bot_config sbc
        )
        INSERT INTO slack_channel_config (
            app_id,
            persona_id,
            channel_config,
            response_type,
            enable_auto_filters
        )
        SELECT
            (SELECT bot_id FROM default_bot_id),
            cn.persona_id,
            jsonb_build_object(
                'channel_name', cn.channel_name,
                'respond_tag_only',
                COALESCE((cn.respond_tag_only)::boolean, false),
                'respond_to_bots',
                COALESCE((cn.respond_to_bots)::boolean, false),
                'respond_member_group_list',
                COALESCE(cn.respond_member_group_list, '[]'::jsonb),
                'answer_filters',
                COALESCE(cn.answer_filters, '[]'::jsonb),
                'follow_up_tags',
                COALESCE(cn.follow_up_tags, '[]'::jsonb)
            ),
            cn.response_type,
            cn.enable_auto_filters
        FROM channel_names cn;
    """,
        params={"first_row_id": first_row_id},
    )

    # Clean up old tokens if they existed
    try:
        if bot_token and app_token:
            logger.info(f"{revision}: Removing old bot and app tokens.")
            get_kv_store().delete("slack_bot_tokens_config_key")
    except Exception:
        logger.warning("tried to delete tokens in dynamic config but failed")

    # Drop old table
    op.drop_table("slack_bot_config")

    logger.info(f"{revision}: Migration complete.")


def downgrade() -> None:
    # Recreate the old slack_bot_config table
    op.create_table(
        "slack_bot_config",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("persona_id", sa.Integer(), nullable=True),
        sa.Column("channel_config", postgresql.JSONB(), nullable=False),
        sa.Column("response_type", sa.String(), nullable=False),
        sa.Column("enable_auto_filters", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["persona_id"],
            ["persona.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Migrate data back to the old format
    op.execute(
        """
        INSERT INTO slack_bot_config (
            persona_id,
            channel_config,
            response_type,
            enable_auto_filters
        )
        SELECT DISTINCT
            persona_id,
            jsonb_build_object(
                'channel_names', jsonb_agg(channel_config->>'channel_name'),
                'respond_tag_only', bool_or((channel_config->>'respond_tag_only')::boolean),
                'respond_to_bots', bool_or((channel_config->>'respond_to_bots')::boolean),
                'respond_member_group_list', channel_config->'respond_member_group_list',
                'answer_filters', channel_config->'answer_filters',
                'follow_up_tags', channel_config->'follow_up_tags'
            ),
            response_type,
            enable_auto_filters
        FROM slack_channel_config
        GROUP BY persona_id, response_type, enable_auto_filters;
    """
    )

    # Drop the new tables in reverse order
    op.drop_table("slack_bot__slack_channel_config")
    op.drop_table("slack_channel_config")
    op.drop_table("slack_bot")
