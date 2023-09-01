import logging
import random
import string
from typing import cast

from retry import retry
from slack_sdk import WebClient
from slack_sdk.models.blocks import Block
from slack_sdk.models.metadata import Metadata

from danswer.configs.app_configs import DANSWER_BOT_NUM_RETRIES
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.utils.logger import setup_logger


logger = setup_logger()


@retry(
    tries=DANSWER_BOT_NUM_RETRIES,
    delay=0.25,
    backoff=2,
    logger=cast(logging.Logger, logger),
)
def respond_in_thread(
    client: WebClient,
    channel: str,
    thread_ts: str,
    text: str | None = None,
    blocks: list[Block] | None = None,
    metadata: Metadata | None = None,
) -> None:
    if not text and not blocks:
        raise ValueError("One of `text` or `blocks` must be provided")

    if text:
        logger.debug(f"Trying to send message: {text}")
    if blocks:
        logger.debug(f"Trying to send blocks: {blocks}")

    slack_call = make_slack_api_rate_limited(client.chat_postMessage)
    response = slack_call(
        channel=channel,
        text=text,
        blocks=blocks,
        thread_ts=thread_ts,
        metadata=metadata,
    )
    if not response.get("ok"):
        raise RuntimeError(f"Unable to post message: {response}")


def build_block_id_from_query_event_id(query_event_id: int) -> str:
    return f"{''.join(random.choice(string.ascii_letters) for _ in range(5))}:{query_event_id}"


def get_query_event_id_from_block_id(block_id: str) -> int:
    return int(block_id.split(":")[-1])
