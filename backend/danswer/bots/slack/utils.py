import logging
import random
import re
import string
from typing import cast

from retry import retry
from slack_sdk import WebClient
from slack_sdk.models.blocks import Block
from slack_sdk.models.metadata import Metadata

from danswer.configs.app_configs import DANSWER_BOT_NUM_RETRIES
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import replace_whitespaces_w_space

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
    unfurl: bool = True,
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
        unfurl_links=unfurl,
        unfurl_media=unfurl,
    )
    if not response.get("ok"):
        raise RuntimeError(f"Unable to post message: {response}")


def build_block_id_from_query_event_id(query_event_id: int) -> str:
    return f"{''.join(random.choice(string.ascii_letters) for _ in range(5))}:{query_event_id}"


def get_query_event_id_from_block_id(block_id: str) -> int:
    return int(block_id.split(":")[-1])


def translate_vespa_highlight_to_slack(match_strs: list[str]) -> str:
    def _replace_highlight(s: str) -> str:
        s = re.sub(r"</hi>(?=\S)", "", s)
        s = re.sub(r"(?<=\S)<hi>", "", s)
        s = s.replace("</hi>", "*").replace("<hi>", "*")
        return s

    final_matches = [
        replace_whitespaces_w_space(_replace_highlight(match_str)).strip()
        for match_str in match_strs
        if match_str
    ]

    return "....".join(final_matches)
