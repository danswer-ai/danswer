import json
from collections.abc import Callable
from collections.abc import Generator
from datetime import datetime
from datetime import timezone
from pathlib import Path
from typing import Any
from typing import cast

from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from slack_sdk.web import SlackResponse

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.retry_wrapper import retry_builder
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.connectors.slack.utils import get_message_link
from danswer.connectors.slack.utils import make_slack_api_call_logged
from danswer.connectors.slack.utils import make_slack_api_call_paginated
from danswer.connectors.slack.utils import make_slack_api_rate_limited
from danswer.connectors.slack.utils import SlackTextCleaner
from danswer.utils.logger import setup_logger

logger = setup_logger()


ChannelType = dict[str, Any]
MessageType = dict[str, Any]
# list of messages in a thread
ThreadType = list[MessageType]

basic_retry_wrapper = retry_builder()


def _make_paginated_slack_api_call(
    call: Callable[..., SlackResponse], **kwargs: Any
) -> Generator[dict[str, Any], None, None]:
    return make_slack_api_call_paginated(
        basic_retry_wrapper(
            make_slack_api_rate_limited(make_slack_api_call_logged(call))
        )
    )(**kwargs)


def _make_slack_api_call(
    call: Callable[..., SlackResponse], **kwargs: Any
) -> SlackResponse:
    return basic_retry_wrapper(
        make_slack_api_rate_limited(make_slack_api_call_logged(call))
    )(**kwargs)


def get_channel_info(client: WebClient, channel_id: str) -> ChannelType:
    """Get information about a channel. Needed to convert channel ID to channel name"""
    return _make_slack_api_call(client.conversations_info, channel=channel_id)[0][
        "channel"
    ]


def _get_channels(
    client: WebClient,
    exclude_archived: bool,
    get_private: bool,
) -> list[ChannelType]:
    channels: list[dict[str, Any]] = []
    for result in _make_paginated_slack_api_call(
        client.conversations_list,
        exclude_archived=exclude_archived,
        # also get private channels the bot is added to
        types=["public_channel", "private_channel"]
        if get_private
        else ["public_channel"],
    ):
        channels.extend(result["channels"])

    return channels


def get_channels(
    client: WebClient,
    exclude_archived: bool = True,
) -> list[ChannelType]:
    """Get all channels in the workspace"""
    # try getting private channels as well at first
    try:
        return _get_channels(
            client=client, exclude_archived=exclude_archived, get_private=True
        )
    except SlackApiError as e:
        logger.info(f"Unable to fetch private channels due to - {e}")

    return _get_channels(
        client=client, exclude_archived=exclude_archived, get_private=False
    )


def get_channel_messages(
    client: WebClient,
    channel: dict[str, Any],
    oldest: str | None = None,
    latest: str | None = None,
) -> Generator[list[MessageType], None, None]:
    """Get all messages in a channel"""
    # join so that the bot can access messages
    if not channel["is_member"]:
        _make_slack_api_call(
            client.conversations_join,
            channel=channel["id"],
            is_private=channel["is_private"],
        )
        logger.info(f"Successfully joined '{channel['name']}'")

    for result in _make_paginated_slack_api_call(
        client.conversations_history,
        channel=channel["id"],
        oldest=oldest,
        latest=latest,
    ):
        yield cast(list[MessageType], result["messages"])


def get_thread(client: WebClient, channel_id: str, thread_id: str) -> ThreadType:
    """Get all messages in a thread"""
    threads: list[MessageType] = []
    for result in _make_paginated_slack_api_call(
        client.conversations_replies, channel=channel_id, ts=thread_id
    ):
        threads.extend(result["messages"])
    return threads


def get_latest_message_time(thread: ThreadType) -> datetime:
    max_ts = max([float(msg.get("ts", 0)) for msg in thread])
    return datetime.fromtimestamp(max_ts, tz=timezone.utc)


def get_event_time(event: dict[str, Any]) -> datetime | None:
    ts = event.get("ts")
    if not ts:
        return None
    return datetime.fromtimestamp(float(ts), tz=timezone.utc)


def thread_to_doc(
    workspace: str,
    channel: ChannelType,
    thread: ThreadType,
    slack_cleaner: SlackTextCleaner,
) -> Document:
    channel_id = channel["id"]
    return Document(
        id=f"{channel_id}__{thread[0]['ts']}",
        sections=[
            Section(
                link=get_message_link(
                    event=m, workspace=workspace, channel_id=channel_id
                ),
                text=slack_cleaner.index_clean(cast(str, m["text"])),
            )
            for m in thread
        ],
        source=DocumentSource.SLACK,
        semantic_identifier=channel["name"],
        doc_updated_at=get_latest_message_time(thread),
        title="",  # slack docs don't really have a "title"
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
    # Don't keep messages from bots
    if message.get("bot_id") or message.get("app_id"):
        return True

    # Uninformative
    if message.get("subtype", "") in _DISALLOWED_MSG_SUBTYPES:
        return True

    return False


def _filter_channels(
    all_channels: list[dict[str, Any]], channels_to_connect: list[str] | None
) -> list[dict[str, Any]]:
    if not channels_to_connect:
        return all_channels

    # validate that all channels in `channels_to_connect` are valid
    # fail loudly in the case of an invalid channel so that the user
    # knows that one of the channels they've specified is typo'd or private
    all_channel_names = {channel["name"] for channel in all_channels}
    for channel in channels_to_connect:
        if channel not in all_channel_names:
            raise ValueError(
                f"Channel '{channel}' not found in workspace. "
                f"Available channels: {all_channel_names}"
            )

    return [
        channel for channel in all_channels if channel["name"] in channels_to_connect
    ]


def get_all_docs(
    client: WebClient,
    workspace: str,
    channels: list[str] | None = None,
    oldest: str | None = None,
    latest: str | None = None,
    msg_filter_func: Callable[[MessageType], bool] = _default_msg_filter,
) -> Generator[Document, None, None]:
    """Get all documents in the workspace, channel by channel"""
    slack_cleaner = SlackTextCleaner(client=client)

    all_channels = get_channels(client)
    filtered_channels = _filter_channels(all_channels, channels)

    for channel in filtered_channels:
        channel_docs = 0
        channel_message_batches = get_channel_messages(
            client=client, channel=channel, oldest=oldest, latest=latest
        )

        seen_thread_ts: set[str] = set()
        for message_batch in channel_message_batches:
            for message in message_batch:
                filtered_thread: ThreadType | None = None
                thread_ts = message.get("thread_ts")
                if thread_ts:
                    # skip threads we've already seen, since we've already processed all
                    # messages in that thread
                    if thread_ts in seen_thread_ts:
                        continue
                    seen_thread_ts.add(thread_ts)
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
                        slack_cleaner=slack_cleaner,
                    )

        logger.info(
            f"Pulled {channel_docs} documents from slack channel {channel['name']}"
        )


class SlackLoadConnector(LoadConnector):
    def __init__(
        self,
        workspace: str,
        export_path_str: str,
        channels: list[str] | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.workspace = workspace
        self.channels = channels
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
                    title="",  # slack docs don't really have a "title"
                    doc_updated_at=get_event_time(slack_event),
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
                title="",  # slack docs don't really have a "title"
                doc_updated_at=get_event_time(slack_event),
                metadata={},
            )

        return None

    def load_from_state(self) -> GenerateDocumentsOutput:
        export_path = Path(self.export_path_str)

        with open(export_path / "channels.json") as f:
            all_channels = json.load(f)

        filtered_channels = _filter_channels(all_channels, self.channels)

        document_batch: dict[str, Document] = {}
        for channel_info in filtered_channels:
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
    def __init__(
        self,
        workspace: str,
        channels: list[str] | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.workspace = workspace
        self.channels = channels
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
            raise ConnectorMissingCredentialError("Slack")

        documents: list[Document] = []
        for document in get_all_docs(
            client=self.client,
            workspace=self.workspace,
            channels=self.channels,
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


if __name__ == "__main__":
    import os
    import time

    slack_channel = os.environ.get("SLACK_CHANNEL")
    connector = SlackPollConnector(
        workspace=os.environ["SLACK_WORKSPACE"],
        channels=[slack_channel] if slack_channel else None,
    )
    connector.load_credentials({"slack_bot_token": os.environ["SLACK_BOT_TOKEN"]})

    current = time.time()
    one_day_ago = current - 24 * 60 * 60  # 1 day
    document_batches = connector.poll_source(one_day_ago, current)

    print(next(document_batches))
