import asyncio
from collections.abc import AsyncIterable
from collections.abc import Iterable
from datetime import datetime
from datetime import timezone
from typing import Any

import discord
from discord.channel import TextChannel

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


class DanswerDiscordClient(discord.Client):
    def __init__(
        self,
        channel_names: list[str] | None = None,
        server_ids: list[int] | None = None,
        requested_start_date_string: str | None = None,
        start: datetime | None = None,
        end: datetime | None = None,
        *args: Any,
        **kwargs: Any,
    ) -> None:
        super().__init__(*args, **kwargs)

        # parse requested_start_date_string to datetime
        pull_date: datetime | None = (
            datetime.strptime(requested_start_date_string, "%Y-%m-%d")
            if requested_start_date_string
            else None
        )

        # Set start_time to the later of start and pull_date, or whichever is provided
        self.start_time = (
            max(filter(None, [start, pull_date])) if start or pull_date else None
        )

        self.end_time: datetime | None = end
        self.channel_names: list[str] | None = channel_names
        self.server_ids: list[int] | None = server_ids
        self.requested_start_date_string: str | None = (
            requested_start_date_string  # YYYY-MM-DD
        )
        self.ready = asyncio.Event()
        self.done = False

    async def _fetch_filtered_channels(self) -> list[TextChannel]:
        filtered_channels: list[TextChannel] = []

        async for guild in self.fetch_guilds():
            if (self.server_ids is None) or (guild.id in self.server_ids):
                channels = await guild.fetch_channels()
                for channel in channels:
                    if not isinstance(channel, TextChannel):
                        continue
                    if self.channel_names and channel.name not in self.channel_names:
                        continue
                    filtered_channels.append(channel)

        logger.info(
            f"Found {len(filtered_channels)} channels for the authenticated user"
        )
        return filtered_channels

    async def on_ready(self) -> None:
        self.ready.set()

    async def process_messages(self) -> AsyncIterable[Document]:
        await self.ready.wait()
        try:
            filtered_channels: list[TextChannel] = await self._fetch_filtered_channels()

            for channel in filtered_channels:
                # process the messages not in any thread
                sections: list[Section] = []
                metadata: dict[str, str | list[str]] = {"Channel": channel.name}
                title = ""

                async for channel_message in channel.history(
                    after=self.start_time,
                    before=self.end_time,
                ):
                    if channel_message.type != discord.MessageType.default:
                        continue

                    # Reset sections for each message since each message is a new document
                    sections = []
                    # Add the initial message as a section
                    sections.append(
                        Section(
                            text=channel_message.content,
                            link=channel_message.jump_url,
                        )
                    )

                    snippet = (
                        channel_message.content[:30].rstrip() + "..."
                        if len(channel_message.content) > 30
                        else channel_message.content
                    )
                    semantic_substring = f"Channel: #{channel.name}"

                    thread_message = channel_message  # Default to channel message
                    # Add the messages in the thread as sections
                    if channel_message.thread:
                        # If its a thread, update the metadata, title, and semantic_substring
                        metadata["Thread"] = channel_message.thread.name
                        title = channel_message.thread.name
                        semantic_substring += (
                            f" in Thread: {channel_message.thread.name}"
                        )

                        async for thread_message in channel_message.thread.history(
                            after=self.start_time,
                            before=self.end_time,
                        ):
                            if thread_message.type != discord.MessageType.default:
                                continue
                            sections.append(
                                Section(
                                    text=thread_message.content,
                                    link=thread_message.jump_url,
                                )
                            )

                    semantic_identifier = f"{channel_message.author.name} said in {semantic_substring}: {snippet}"

                    yield Document(
                        id=str(channel_message.id),
                        source=DocumentSource.DISCORD,
                        semantic_identifier=semantic_identifier,
                        doc_updated_at=thread_message.edited_at,
                        title=title,
                        sections=sections,
                        metadata=metadata,
                    )

        finally:
            self.done = True
            logger.info("Closing the danswer discord client connection")
            await self.close()


def _fetch_all_docs(
    token: str,
    start: datetime | None = None,
    end: datetime | None = None,
    requested_start_date_string: str | None = None,
    channel_names: list[str] | None = None,
    server_ids: list[int] | None = None,
) -> Iterable[Document]:
    async def _async_fetch() -> AsyncIterable[Document]:
        intents = discord.Intents.default()
        intents.message_content = True
        client = DanswerDiscordClient(
            channel_names=channel_names,
            server_ids=server_ids,
            requested_start_date_string=requested_start_date_string,
            start=start,
            end=end,
            intents=intents,
        )

        try:
            asyncio.create_task(client.start(token))
            async for doc in client.process_messages():
                yield doc
        finally:
            if not client.is_closed():
                await client.close()

    def run_and_yield() -> Iterable[Document]:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            async_gen = _async_fetch()
            while True:
                try:
                    # Create a coroutine by calling anext with the async generator
                    next_coro = anext(async_gen)  # type: ignore
                    # Run the coroutine to get the next document
                    doc = loop.run_until_complete(next_coro)
                    yield doc
                except StopAsyncIteration:
                    break
        finally:
            loop.close()

    return run_and_yield()


class DiscordConnector(PollConnector, LoadConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        server_ids: list[str] | None = None,
        channel_names: list[str] | None = None,
        start_date: str | None = None,  # YYYY-MM-DD
    ):
        self.batch_size = batch_size
        self.channel_names: list[str] | None = channel_names
        self.server_ids: list[int] | None = (
            [int(server_id) for server_id in server_ids] if server_ids else None
        )
        self._discord_bot_token: str | None = None
        self.requested_start_date_string = start_date

    @property
    def discord_bot_token(self) -> str:
        if self._discord_bot_token is None:
            raise ConnectorMissingCredentialError("Discord")
        return self._discord_bot_token

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self._discord_bot_token = credentials["discord_bot_token"]
        # intents = discord.Intents.default()
        # intents.message_content = True
        # self.client = discord.Client(intents=intents)
        return None

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        doc_batch = []
        for doc in _fetch_all_docs(
            token=self.discord_bot_token,
            start=datetime.fromtimestamp(start, tz=timezone.utc),
            end=datetime.fromtimestamp(end, tz=timezone.utc),
            requested_start_date_string=self.requested_start_date_string,
            channel_names=self.channel_names,
            server_ids=self.server_ids,
        ):
            doc_batch.append(doc)
            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        if doc_batch:
            yield doc_batch

    def load_from_state(self) -> GenerateDocumentsOutput:
        doc_batch = []
        for doc in _fetch_all_docs(
            token=self.discord_bot_token,
            requested_start_date_string=self.requested_start_date_string,
            channel_names=self.channel_names,
            server_ids=self.server_ids,
        ):
            doc_batch.append(doc)
            if len(doc_batch) >= self.batch_size:
                yield doc_batch
                doc_batch = []

        if doc_batch:
            yield doc_batch


if __name__ == "__main__":
    import os
    import time

    end = time.time()
    start = end - 24 * 60 * 60 * 1  # 1 day
    server_ids: str | None = os.environ.get("server_ids", None)  # "1,2,3"
    channel_names: str | None = os.environ.get(
        "channel_names", None
    )  # "channel1,channel2"

    connector = DiscordConnector(
        server_ids=server_ids.split(",") if server_ids else None,
        channel_names=channel_names.split(",") if channel_names else None,
        start_date=os.environ.get("start_date", None),
    )
    connector.load_credentials(
        {"discord_bot_token": os.environ.get("discord_bot_token")}
    )

    for doc_batch in connector.poll_source(start, end):
        for doc in doc_batch:
            print(doc)
