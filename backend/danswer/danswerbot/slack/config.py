from sqlalchemy.orm import Session

from danswer.db.models import SlackBotConfig
from danswer.db.slack_bot_config import fetch_slack_bot_configs


VALID_SLACK_FILTERS = [
    "answerable_prefilter",
    "well_answered_postfilter",
    "questionmark_prefilter",
]


def get_slack_bot_config_for_channel(
    channel_name: str | None, db_session: Session
) -> SlackBotConfig | None:
    if not channel_name:
        return None

    slack_bot_configs = fetch_slack_bot_configs(db_session=db_session)
    for config in slack_bot_configs:
        if channel_name in config.channel_config["channel_names"]:
            return config

    return None


def validate_channel_names(
    channel_names: list[str],
    current_slack_bot_config_id: int | None,
    db_session: Session,
) -> list[str]:
    """Make sure that these channel_names don't exist in other slack bot configs.
    Returns a list of cleaned up channel names (e.g. '#' removed if present)"""
    slack_bot_configs = fetch_slack_bot_configs(db_session=db_session)
    cleaned_channel_names = [
        channel_name.lstrip("#").lower() for channel_name in channel_names
    ]
    for slack_bot_config in slack_bot_configs:
        if slack_bot_config.id == current_slack_bot_config_id:
            continue

        for channel_name in cleaned_channel_names:
            if channel_name in slack_bot_config.channel_config["channel_names"]:
                raise ValueError(
                    f"Channel name '{channel_name}' already exists in "
                    "another slack bot config"
                )

    return cleaned_channel_names
