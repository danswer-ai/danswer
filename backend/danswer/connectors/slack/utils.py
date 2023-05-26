from typing import Any
from typing import cast

from danswer.connectors.slack.config import get_slack_bot_token
from danswer.connectors.slack.config import get_workspace_id
from slack_sdk import WebClient


# TODO Needs to be retired when event based slack connector reworked
def get_client() -> WebClient:
    """NOTE: assumes token is present in environment variable SLACK_BOT_TOKEN"""
    return WebClient(token=get_slack_bot_token())


def get_message_link(
    event: dict[str, Any], workspace: str | None = None, channel_id: str | None = None
) -> str:
    channel_id = channel_id or cast(
        str, event["channel"]
    )  # channel must either be present in the event or passed in
    message_ts = cast(str, event["ts"])
    message_ts_without_dot = message_ts.replace(".", "")
    return f"https://{workspace or get_workspace_id()}.slack.com/archives/{channel_id}/p{message_ts_without_dot}"
