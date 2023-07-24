import json
import os
from collections.abc import Callable
from collections.abc import Generator
from pathlib import Path
from typing import Any
from typing import cast

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.slack.utils import get_message_link
from danswer.connectors.slack.utils import make_slack_api_call_paginated
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.connectors.slack.utils import UserIdReplacer
from danswer.utils.logger import setup_logger
from slack_sdk import WebClient
from slack_sdk.web import SlackResponse

logger = setup_logger()


ChannelType = dict[str, Any]
MessageType = dict[str, Any]
# list of messages in a thread
ThreadType = list[MessageType]


def _make_slack_api_call(
    call: Callable[..., SlackResponse], **kwargs: Any
) -> list[dict[str, Any]]:
    return make_slack_api_call_paginated(make_slack_api_rate_limited(call))(**kwargs)


def get_channel_info(client: WebClient, channel_id: str) -> ChannelType:
    """Get information about a channel. Needed to convert channel ID to channel name"""
    return _make_slack_api_call(client.conversations_info, channel=channel_id)[0][
        "channel"
    ]


def get_channels(client: WebClient, exclude_archived: bool = True) -> list[ChannelType]:
    """Get all channels in the workspace"""
    channels: list[dict[str, Any]] = []
    for result in _make_slack_api_call(client.conversations_list, exclude_archived=exclude_archived):
        channels.extend(result["channels"])
    return channels


def get_channel_messages(
    client: WebClient,
    channel: dict[str, Any],
    oldest: str | None = None,
    latest: str | None = None,
) -> Generator[list[MessageType], None, None]:
    """Get all messages in a channel"""
    # join so that the bot can access messages
    if not channel["is_member"]:
        client.conversations_join(
            channel=channel["id"], is_private=channel["is_private"]
        )

    for result in _make_slack_api_call(
        client.conversations_history,
        channel=channel["id"],
        oldest=oldest,
        latest=latest,
    ):
        yield cast(list[MessageType], result["messages"])


def get_thread(client: WebClient, channel_id: str, thread_id: str) -> ThreadType:
    """Get all messages in a thread"""
    threads: list[MessageType] = []
    for result in _make_slack_api_call(
        client.conversations_replies, channel=channel_id, ts=thread_id
    ):
        threads.extend(result["messages"])
    return threads


def thread_to_doc(
    workspace: str,
    channel: ChannelType,
    thread: ThreadType,
    user_id_replacer: UserIdReplacer,
) -> Document:
    channel_id = channel["id"]
    return Document(
        id=f"{channel_id}__{thread[0]['ts']}",
        sections=[
            Section(
                link=get_message_link(
                    event=m, workspace=workspace, channel_id=channel_id
                ),
                text=user_id_replacer.replace_user_ids_with_names(cast(str, m["text"])),
            )
            for m in thread
        ],
        source=DocumentSource.SLACK,
        semantic_identifier=channel["name"],
        metadata={},
    )


# list of subtypes can be found here: https://api.slack.com/events/message
_DISALLOWED_MSG_SUBTYPES = {
    "channel_join",
    "channel_leave",
    "channel_archive",
    "channel_unarchive",
    "pinned_item",
    "unpinned_item",
    "ekm_access_denied",
    "channel_posting_permissions",
    "group_join",
    "group_leave",
    "group_archive",
    "group_unarchive",
}


def _default_msg_filter(message: MessageType) -> bool:
    return message.get("subtype", "") in _DISALLOWED_MSG_SUBTYPES


def get_all_docs(
    client: WebClient,
    workspace: str,
    oldest: str | None = None,
    latest: str | None = None,
    msg_filter_func: Callable[[MessageType], bool] = _default_msg_filter,
) -> Generator[Document, None, None]:
    """Get all documents in the workspace, channel by channel"""
    user_id_replacer = UserIdReplacer(client=client)

    channels = get_channels(client)

    for channel in channels:
        channel_docs = 0
        channel_message_batches = get_channel_messages(
            client=client, channel=channel, oldest=oldest, latest=latest
        )

        for message_batch in channel_message_batches:
            for message in message_batch:
                filtered_thread: ThreadType | None = None
                thread_ts = message.get("thread_ts")
                if thread_ts:
                    thread = get_thread(
                        client=client, channel_id=channel["id"], thread_id=thread_ts
                    )
                    filtered_thread = [
                        message for message in thread if not msg_filter_func(message)
                    ]
                elif not msg_filter_func(message):
                    filtered_thread = [message]

                if filtered_thread:
                    channel_docs += 1
                    yield thread_to_doc(
                        workspace=workspace,
                        channel=channel,
                        thread=filtered_thread,
                        user_id_replacer=user_id_replacer,
                    )

        logger.info(
            f"Pulled {channel_docs} documents from slack channel {channel['name']}"
        )


class SlackLoadConnector(LoadConnector):
    def __init__(
        self, workspace: str, export_path_str: str, batch_size: int = INDEX_BATCH_SIZE
    ) -> None:
        self.workspace = workspace
        self.export_path_str = export_path_str
        self.batch_size = batch_size

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        if credentials:
            logger.warning("Unexpected credentials provided for Slack Load Connector")
        return None

    @staticmethod
    def _process_batch_event(
        slack_event: dict[str, Any],
        channel: dict[str, Any],
        matching_doc: Document | None,
        workspace: str,
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
                                event=slack_event,
                                workspace=workspace,
                                channel_id=channel["id"],
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
                            event=slack_event,
                            workspace=workspace,
                            channel_id=channel["id"],
                        ),
                        text=slack_event["text"],
                    )
                ],
                source=DocumentSource.SLACK,
                semantic_identifier=channel["name"],
                metadata={},
            )

        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
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
                    doc = self._process_batch_event(
                        slack_event=slack_event,
                        channel=channel_info,
                        matching_doc=document_batch.get(
                            slack_event.get("thread_ts", "")
                        ),
                        workspace=self.workspace,
                    )
                    if doc:
                        document_batch[doc.id] = doc
                        if len(document_batch) >= self.batch_size:
                            yield list(document_batch.values())

        yield list(document_batch.values())


class SlackPollConnector(PollConnector):
    def __init__(self, workspace: str, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.workspace = workspace
        self.batch_size = batch_size
        self.client: WebClient | None = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        bot_token = credentials["slack_bot_token"]
        self.client = WebClient(token=bot_token)
        return None

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if self.client is None:
            raise PermissionError(
                "Slack Client is not set up, was load_credentials called?"
            )

        documents: list[Document] = []
        for document in get_all_docs(
            client=self.client,
            workspace=self.workspace,
            # NOTE: need to impute to `None` instead of using 0.0, since Slack will
            # throw an error if we use 0.0 on an account without infinite data
            # retention
            oldest=str(start) if start else None,
            latest=str(end),
        ):
            documents.append(document)
            if len(documents) >= self.batch_size:
                yield documents
                documents = []

        if documents:
            yield documents
