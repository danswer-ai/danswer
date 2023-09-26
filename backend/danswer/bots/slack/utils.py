import logging
import random
import re
import string
from typing import Any
from typing import cast

from retry import retry
from slack_sdk import WebClient
from slack_sdk.models.blocks import Block
from slack_sdk.models.metadata import Metadata

from danswer.bots.slack.tokens import fetch_tokens
from danswer.configs.app_configs import DANSWER_BOT_NUM_RETRIES
from danswer.configs.constants import ID_SEPARATOR
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.connectors.slack.utils import UserIdReplacer
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import replace_whitespaces_w_space

logger = setup_logger()


def get_web_client() -> WebClient:
    slack_tokens = fetch_tokens()
    return WebClient(token=slack_tokens.bot_token)


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


def build_feedback_block_id(
    query_event_id: int,
    document_id: str | None = None,
    document_rank: int | None = None,
) -> str:
    unique_prefix = "".join(random.choice(string.ascii_letters) for _ in range(10))
    if document_id is not None:
        if not document_id or document_rank is None:
            raise ValueError("Invalid document, missing information")
        if ID_SEPARATOR in document_id:
            raise ValueError(
                "Separator pattern should not already exist in document id"
            )
        block_id = ID_SEPARATOR.join(
            [str(query_event_id), document_id, str(document_rank)]
        )
    else:
        block_id = str(query_event_id)

    return unique_prefix + ID_SEPARATOR + block_id


def decompose_block_id(block_id: str) -> tuple[int, str | None, int | None]:
    """Decompose into query_id, document_id, document_rank, see above function"""
    try:
        components = block_id.split(ID_SEPARATOR)
        if len(components) != 2 and len(components) != 4:
            raise ValueError("Block ID does not contain right number of elements")

        if len(components) == 2:
            return int(components[-1]), None, None

        return int(components[1]), components[2], int(components[3])

    except Exception as e:
        logger.error(e)
        raise ValueError("Received invalid Feedback Block Identifier")


def translate_vespa_highlight_to_slack(match_strs: list[str], used_chars: int) -> str:
    def _replace_highlight(s: str) -> str:
        s = re.sub(r"(?<=[^\s])<hi>(.*?)</hi>", r"\1", s)
        s = s.replace("</hi>", "*").replace("<hi>", "*")
        return s

    final_matches = [
        replace_whitespaces_w_space(_replace_highlight(match_str)).strip()
        for match_str in match_strs
        if match_str
    ]
    combined = "... ".join(final_matches)

    # Slack introduces "Show More" after 300 on desktop which is ugly
    # But don't trim the message if there is still a highlight after 300 chars
    remaining = 300 - used_chars
    if len(combined) > remaining and "*" not in combined[remaining:]:
        combined = combined[: remaining - 3] + "..."

    return combined


def remove_slack_text_interactions(slack_str: str) -> str:
    slack_str = UserIdReplacer.replace_tags_basic(slack_str)
    slack_str = UserIdReplacer.replace_channels_basic(slack_str)
    slack_str = UserIdReplacer.replace_special_mentions(slack_str)
    slack_str = UserIdReplacer.replace_links(slack_str)
    slack_str = UserIdReplacer.add_zero_width_whitespace_after_tag(slack_str)
    return slack_str


def get_channel_from_id(client: WebClient, channel_id: str) -> dict[str, Any]:
    response = client.conversations_info(channel=channel_id)
    response.validate()
    return response["channel"]


def get_channel_name_from_id(client: WebClient, channel_id: str) -> str:
    return get_channel_from_id(client, channel_id)["name"]
