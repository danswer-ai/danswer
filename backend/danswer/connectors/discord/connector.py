import asyncio
from collections.abc import AsyncIterable
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import List

import discord
from discord.channel import TextChannel

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
        start: datetime,
        end: datetime,
        channel_names: List[str] | None = None,
        server_ids: List[int] | None = None,
        pull_date_from: str | None = None,
        *args: Any,
        **kwargs: Any,
    ) -> None:
        super().__init__(*args, **kwargs)
        # read start_time and end_time
        self.start_time: datetime = start
        self.end_time: datetime = end
        self.channel_names: List[str] | None = channel_names
        self.server_ids: List[int] | None = server_ids
        self.pull_date_from: str | None = pull_date_from  # YYYY-MM-DD
        self.docs: list[Document] = []

    async def on_ready(self) -> None:
        try:
            docs: list[Document] = []

            channel_names = self.channel_names
            server_ids = self.server_ids
            start: datetime = self.start_time
            end: datetime = self.end_time
            pull_date_from: datetime | None = (
                datetime.strptime(self.pull_date_from, "%Y-%m-%d")
                if self.pull_date_from
                else None
            )

            if pull_date_from:
                start = max(start, pull_date_from)

            if start > end:
                self.docs = []
                return

            filtered_channels: list[TextChannel] = []
            async for guild in self.fetch_guilds():
                if (server_ids is None) or (server_ids and guild.id in server_ids):
                    guild_channels = await guild.fetch_channels()
                    for channel in guild_channels:
                        if (
                            (channel_names is None)
                            or (channel_names and channel.name in channel_names)
                        ) and isinstance(channel, discord.TextChannel):
                            filtered_channels.append(channel)

            logger.info(
                f"Found {len(filtered_channels)} channels for the authenticated user"
            )

            sections: list[Section] = []
            for channel in filtered_channels:
                # process the messages not in any thread
                max_ts = start
                sections = []
                async for channel_message in channel.history(after=start, before=end):
                    if channel_message.thread is None:
                        sections.append(
                            Section(
                                text=channel_message.content,
                                link=channel_message.jump_url,
                            )
                        )
                        if channel_message.edited_at:
                            max_ts = max(channel_message.edited_at, max_ts)

                if len(sections) > 0:
                    docs.append(
                        Document(
                            id=str(channel_message.id),
                            source=DocumentSource.DISCORD,
                            semantic_identifier=channel.name,
                            doc_updated_at=max_ts,
                            title=channel.name,
                            sections=sections,
                            metadata={"Channel": channel.name},
                        )
                    )

                # process the messages in threads
                for thread in channel.threads:
                    sections = []
                    max_ts = start
                    async for thread_message in thread.history(
                        after=start,
                        before=end,
                    ):
                        sections.append(
                            Section(
                                text=thread_message.content,
                                link=thread_message.jump_url,
                            )
                        )
                        if thread_message.edited_at:
                            max_ts = max(thread_message.edited_at, max_ts)
                    # if len(docs) >= batch_size:
                    #     yield docs
                    #     docs = []
                    if len(sections) > 0:
                        docs.append(
                            Document(
                                id=str(thread_message.id),
                                source=DocumentSource.DISCORD,
                                semantic_identifier=f"{thread.name} in {channel.name}",
                                doc_updated_at=max_ts,
                                title=thread.name,
                                sections=sections,
                                metadata={
                                    "Channel": channel.name,
                                    "Thread": thread.name,
                                },
                            )
                        )
                self.docs = docs
        finally:
            print("Closing the connection")
            await self.close()


async def _fetch_all_docs(
    token: str,
    start: datetime,
    end: datetime,
    channel_names: List[str] | None,
    server_ids: List[int] | None,
    pull_date_from: str | None,
) -> AsyncIterable[List[Document]]:
    intents = discord.Intents.default()
    intents.message_content = True
    client = DanswerDiscordClient(
        start, end, channel_names, server_ids, pull_date_from, intents=intents
    )
    await client.start(token, reconnect=True)
    # TODO: not sure how to convert this to a sync iterable ?!!
    return client.docs


class DiscordConnector(PollConnector, LoadConnector):
    def __init__(
        self,
        server_ids: list[str] | None = None,
        channel_names: list[str] | None = None,
        start_date: str | None = None,  # YYYY-MM-DD
    ):
        self.channel_names: list[str] | None = channel_names
        self.server_ids: list[int] | None = (
            [int(server_id) for server_id in server_ids] if server_ids else None
        )
        self.discord_bot_token = None
        self.pull_date_from = start_date

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.discord_bot_token = credentials["discord_bot_token"]
        intents = discord.Intents.default()
        intents.message_content = True
        self.client = discord.Client(intents=intents)
        return None

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if self.discord_bot_token is None:
            raise ConnectorMissingCredentialError("Discord")

        # fetch all docs and yield
        # TODO: not sure how to convert this to a sync iterable ?!!
        for doc in asyncio.run(
            _fetch_all_docs(
                self.discord_bot_token,
                datetime.fromtimestamp(start, tz=timezone.utc),
                datetime.fromtimestamp(end, tz=timezone.utc),
                self.channel_names,
                self.server_ids,
                self.pull_date_from,
            )
        ):
            yield doc

    def load_from_state(self) -> GenerateDocumentsOutput:
        if self.discord_bot_token is None:
            raise ConnectorMissingCredentialError("Discord")

        for doc in asyncio.run(
            _fetch_all_docs(
                self.discord_bot_token,
                datetime(1970, 1, 1, tzinfo=timezone.utc),
                datetime.now(timezone.utc),
                self.channel_names,
                self.server_ids,
                self.pull_date_from,
            )
        ):
            yield doc


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
    connector.load_credentials({"discord_bot_token": os.environ["discord_bot_token"]})

    for doc in connector.poll_source(start, end):
        print(doc)
