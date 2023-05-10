import time
from collections.abc import Callable
from collections.abc import Generator
from typing import Any
from typing import cast
from typing import List

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.slack.utils import get_client
from danswer.connectors.slack.utils import get_message_link
from danswer.connectors.type_aliases import PullLoader
from danswer.connectors.type_aliases import SecondsSinceUnixEpoch
from danswer.utils.logging import setup_logger
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from slack_sdk.web import SlackResponse

logger = setup_logger()

SLACK_LIMIT = 900


MessageType = dict[str, Any]
# list of messages in a thread
ThreadType = list[MessageType]


def _make_slack_api_call_paginated(
    call: Callable[..., SlackResponse],
) -> Callable[..., list[dict[str, Any]]]:
    """Wraps calls to slack API so that they automatically handle pagination"""

    def paginated_call(**kwargs: Any) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        cursor: str | None = None
        has_more = True
        while has_more:
            for result in call(cursor=cursor, limit=SLACK_LIMIT, **kwargs):
                has_more = result.get("has_more", False)
                cursor = result.get("response_metadata", {}).get("next_cursor", "")
                results.append(cast(dict[str, Any], result))
        return results

    return paginated_call


def _make_slack_api_rate_limited(
    call: Callable[..., SlackResponse], max_retries: int = 3
) -> Callable[..., SlackResponse]:
    """Wraps calls to slack API so that they automatically handle rate limiting"""

    def rate_limited_call(**kwargs: Any) -> SlackResponse:
        for _ in range(max_retries):
            try:
                # Make the API call
                response = call(**kwargs)

                # Check for errors in the response
                if response.get("ok"):
                    return response
                else:
                    raise SlackApiError("", response)

            except SlackApiError as e:
                if e.response["error"] == "ratelimited":
                    # Handle rate limiting: get the 'Retry-After' header value and sleep for that duration
                    retry_after = int(e.response.headers.get("Retry-After", 1))
                    time.sleep(retry_after)
                else:
                    # Raise the error for non-transient errors
                    raise

        # If the code reaches this point, all retries have been exhausted
        raise Exception(f"Max retries ({max_retries}) exceeded")

    return rate_limited_call


def _make_slack_api_call(
    call: Callable[..., SlackResponse], **kwargs: Any
) -> list[dict[str, Any]]:
    return _make_slack_api_call_paginated(_make_slack_api_rate_limited(call))(**kwargs)


def get_channels(client: WebClient) -> list[dict[str, Any]]:
    """Get all channels in the workspace"""
    channels: list[dict[str, Any]] = []
    for result in _make_slack_api_call(client.conversations_list):
        channels.extend(result["channels"])
    return channels


def get_channel_messages(
    client: WebClient,
    channel: dict[str, Any],
    oldest: str | None = None,
    latest: str | None = None,
) -> list[MessageType]:
    """Get all messages in a channel"""
    # join so that the bot can access messages
    if not channel["is_member"]:
        client.conversations_join(
            channel=channel["id"], is_private=channel["is_private"]
        )

    messages: list[MessageType] = []
    for result in _make_slack_api_call(
        client.conversations_history,
        channel=channel["id"],
        oldest=oldest,
        latest=latest,
    ):
        messages.extend(result["messages"])
    return messages


def get_thread(client: WebClient, channel_id: str, thread_id: str) -> ThreadType:
    """Get all messages in a thread"""
    threads: list[MessageType] = []
    for result in _make_slack_api_call(
        client.conversations_replies, channel=channel_id, ts=thread_id
    ):
        threads.extend(result["messages"])
    return threads


def _default_msg_filter(message: MessageType) -> bool:
    return message.get("subtype", "") == "channel_join"


def get_all_threads(
    client: WebClient,
    msg_filter_func: Callable[[MessageType], bool] = _default_msg_filter,
    oldest: str | None = None,
    latest: str | None = None,
) -> dict[str, list[ThreadType]]:
    """Get all threads in the workspace"""
    channels = get_channels(client)
    channel_id_to_messages: dict[str, list[dict[str, Any]]] = {}
    for channel in channels:
        channel_id_to_messages[channel["id"]] = get_channel_messages(
            client=client, channel=channel, oldest=oldest, latest=latest
        )

    channel_to_threads: dict[str, list[ThreadType]] = {}
    for channel_id, messages in channel_id_to_messages.items():
        final_threads: list[ThreadType] = []
        for message in messages:
            thread_ts = message.get("thread_ts")
            if thread_ts:
                thread = get_thread(client, channel_id, thread_ts)
                filtered_thread = [
                    message for message in thread if not msg_filter_func(message)
                ]
                if filtered_thread:
                    final_threads.append(filtered_thread)
            else:
                final_threads.append([message])
        channel_to_threads[channel_id] = final_threads

    return channel_to_threads


def thread_to_doc(channel_id: str, thread: ThreadType) -> Document:
    return Document(
        id=f"{channel_id}__{thread[0]['ts']}",
        sections=[
            Section(
                link=get_message_link(m, channel_id=channel_id),
                text=cast(str, m["text"]),
            )
            for m in thread
        ],
        source=DocumentSource.SLACK,
        semantic_identifier="WIP Slack Channel",  # TODO: chris can you add the identifier for slack?
        metadata={},
    )


def get_all_docs(
    client: WebClient,
    oldest: str | None = None,
    latest: str | None = None,
) -> list[Document]:
    """Get all documents in the workspace"""
    channel_id_to_threads = get_all_threads(client=client, oldest=oldest, latest=latest)
    docs: list[Document] = []
    for channel_id, threads in channel_id_to_threads.items():
        docs.extend(thread_to_doc(channel_id, thread) for thread in threads)
    logger.info(f"Pulled {len(docs)} documents from slack")
    return docs


class SlackPullLoader(PullLoader):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.client = get_client()
        self.batch_size = batch_size

    def load(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> Generator[List[Document], None, None]:
        # TODO: make this respect start and end
        all_docs = get_all_docs(client=self.client, oldest=str(start), latest=str(end))
        for i in range(0, len(all_docs), self.batch_size):
            yield all_docs[i : i + self.batch_size]
