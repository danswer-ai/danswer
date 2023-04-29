from danswer.connectors.slack.config import get_slack_config
from danswer.connectors.slack.config import SlackConfig
from danswer.connectors.slack.config import update_slack_config
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logging import setup_logger
from fastapi import APIRouter

router = APIRouter(prefix="/admin")

logger = setup_logger()


@router.get("/slack_connector_config", response_model=SlackConfig)
def fetch_slack_config():
    try:
        return get_slack_config()
    except ConfigNotFoundError:
        return SlackConfig(slack_bot_token="", workspace_id="")


@router.post("/slack_connector_config")
def modify_slack_config(slack_config: SlackConfig):
    update_slack_config(slack_config)
