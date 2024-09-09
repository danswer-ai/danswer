from slack_sdk import WebClient
from sqlalchemy.orm import Session

from danswer.danswerbot.slack.models import SlackMessageInfo
from danswer.db.models import Prompt
from danswer.db.models import SlackBotConfig
from danswer.utils.logger import DanswerLoggingAdapter
from danswer.utils.logger import setup_logger
from danswer.utils.variable_functionality import fetch_versioned_implementation

logger = setup_logger()


def handle_standard_answers(
    message_info: SlackMessageInfo,
    receiver_ids: list[str] | None,
    slack_bot_config: SlackBotConfig | None,
    prompt: Prompt | None,
    logger: DanswerLoggingAdapter,
    client: WebClient,
    db_session: Session,
) -> bool:
    versioned_rate_limit_strategy = fetch_versioned_implementation(
        "danswer.danswerbot.slack.handlers.handle_standard_answers",
        "_handle_standard_answers",
    )
    return versioned_rate_limit_strategy(
        message_info, receiver_ids, slack_bot_config, prompt, logger, client, db_session
    )


def _handle_standard_answers(
    message_info: SlackMessageInfo,
    receiver_ids: list[str] | None,
    slack_bot_config: SlackBotConfig | None,
    prompt: Prompt | None,
    logger: DanswerLoggingAdapter,
    client: WebClient,
    db_session: Session,
) -> bool:
    return False
