from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from pydantic import BaseModel


SLACK_CONFIG_KEY = "slack_connector_config"


class SlackConfig(BaseModel):
    slack_bot_token: str
    workspace_id: str
    pull_frequency: int = 0  # in minutes, 0 => no pulling


def get_slack_config() -> SlackConfig:
    slack_config = get_dynamic_config_store().load(SLACK_CONFIG_KEY)
    return SlackConfig.parse_obj(slack_config)


def get_slack_bot_token() -> str:
    return get_slack_config().slack_bot_token


def get_workspace_id() -> str:
    return get_slack_config().workspace_id


def get_pull_frequency() -> int:
    return get_slack_config().pull_frequency


def update_slack_config(slack_config: SlackConfig) -> None:
    get_dynamic_config_store().store(SLACK_CONFIG_KEY, slack_config.dict())
