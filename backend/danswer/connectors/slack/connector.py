import json
import os
import time
from collections.abc import Callable
from collections.abc import Generator
from pathlib import Path
from typing import Any
from typing import cast
from typing import List

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.slack.utils import get_client
from danswer.connectors.slack.utils import get_message_link
from danswer.utils.logging import setup_logger
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from slack_sdk.web import SlackResponse

logger = setup_logger()

SLACK_LIMIT = 900


ChannelType = dict[str, Any]
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


def get_channel_info(client: WebClient, channel_id: str) -> ChannelType:
    """Get information about a channel. Needed to convert channel ID to channel name"""
    return _make_slack_api_call(client.conversations_info, channel=channel_id)[0][
        "channel"
    ]


def get_channels(client: WebClient) -> list[ChannelType]:
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


def thread_to_doc(channel: ChannelType, thread: ThreadType) -> Document:
    channel_id = channel["id"]
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
        semantic_identifier=channel["name"],
        metadata={},
    )


def _default_msg_filter(message: MessageType) -> bool:
    return message.get("subtype", "") == "channel_join"


def get_all_docs(
    client: WebClient,
    oldest: str | None = None,
    latest: str | None = None,
    msg_filter_func: Callable[[MessageType], bool] = _default_msg_filter,
) -> list[Document]:
    """Get all documents in the workspace"""
    channels = get_channels(client)
    channel_id_to_channel_info = {channel["id"]: channel for channel in channels}

    channel_id_to_messages: dict[str, list[dict[str, Any]]] = {}
    for channel in channels:
        channel_id_to_messages[channel["id"]] = get_channel_messages(
            client=client, channel=channel, oldest=oldest, latest=latest
        )

    channel_id_to_threads: dict[str, list[ThreadType]] = {}
    for channel_id, messages in channel_id_to_messages.items():
        final_threads: list[ThreadType] = []
        for message in messages:
            thread_ts = message.get("thread_ts")
            if thread_ts:
                thread = get_thread(
                    client=client, channel_id=channel_id, thread_id=thread_ts
                )
                filtered_thread = [
                    message for message in thread if not msg_filter_func(message)
                ]
                if filtered_thread:
                    final_threads.append(filtered_thread)
            else:
                final_threads.append([message])
        channel_id_to_threads[channel_id] = final_threads

    docs: list[Document] = []
    for channel_id, threads in channel_id_to_threads.items():
        docs.extend(
            thread_to_doc(channel=channel_id_to_channel_info[channel_id], thread=thread)
            for thread in threads
        )
    logger.info(f"Pulled {len(docs)} documents from slack")
    return docs


def _process_batch_event(
    slack_event: dict[str, Any],
    channel: dict[str, Any],
    matching_doc: Document | None,
    workspace: str | None = None,
) -> Document | None:
    if (
        slack_event["type"] == "message"
        and slack_event.get("subtype") != "channel_join"
    ):
        if matching_doc:
            return Document(
                id=matching_doc.id,
                sections=matching_doc.sections
                + [
                    Section(
                        link=get_message_link(
                            slack_event, workspace=workspace, channel_id=channel["id"]
                        ),
                        text=slack_event["text"],
                    )
                ],
                source=matching_doc.source,
                semantic_identifier=matching_doc.semantic_identifier,
                metadata=matching_doc.metadata,
            )

        return Document(
            id=slack_event["ts"],
            sections=[
                Section(
                    link=get_message_link(
                        slack_event, workspace=workspace, channel_id=channel["id"]
                    ),
                    text=slack_event["text"],
                )
            ],
            source=DocumentSource.SLACK,
            semantic_identifier=channel["name"],
            metadata={},
        )

    return None


class SlackConnector(LoadConnector, PollConnector):
    def __init__(
        self, export_path_str: str, batch_size: int = INDEX_BATCH_SIZE
    ) -> None:
        self.export_path_str = export_path_str
        self.batch_size = batch_size
        self.client = get_client()

    def load_from_state(self) -> Generator[list[Document], None, None]:
        export_path = Path(self.export_path_str)

        with open(export_path / "channels.json") as f:
            channels = json.load(f)

        document_batch: dict[str, Document] = {}
        for channel_info in channels:
            channel_dir_path = export_path / cast(str, channel_info["name"])
            channel_file_paths = [
                channel_dir_path / file_name
                for file_name in os.listdir(channel_dir_path)
            ]
            for path in channel_file_paths:
                with open(path) as f:
                    events = cast(list[dict[str, Any]], json.load(f))
                for slack_event in events:
                    doc = _process_batch_event(
                        slack_event=slack_event,
                        channel=channel_info,
                        matching_doc=document_batch.get(
                            slack_event.get("thread_ts", "")
                        ),
                    )
                    if doc:
                        document_batch[doc.id] = doc
                        if len(document_batch) >= self.batch_size:
                            yield list(document_batch.values())

        yield list(document_batch.values())

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> Generator[List[Document], None, None]:
        all_docs = get_all_docs(client=self.client, oldest=str(start), latest=str(end))
        for i in range(0, len(all_docs), self.batch_size):
            yield all_docs[i : i + self.batch_size]
