import asyncio
from collections.abc import AsyncIterable
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import List

import discord
from discord.channel import TextChannel

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger

logger = setup_logger()


async def _fetch_all_docs(
    token: str,
    start: SecondsSinceUnixEpoch,
    end: SecondsSinceUnixEpoch,
    channels: List[str] | None,
    server_ids: List[int] | None,
    batch_size: int,
) -> AsyncIterable[List[Document]]:
    docs: list[Document] = []

    class DanswerDiscordClient(discord.Client):
        def __init__(
            self,
            start: SecondsSinceUnixEpoch,
            end: SecondsSinceUnixEpoch,
            *args: Any,
            **kwargs: Any,
        ) -> None:
            super().__init__(*args, **kwargs)
            # read start_time and end_time
            self.start_time = start
            self.end_time = end

        async def on_ready(self) -> None:
            try:
                start: datetime = datetime.fromtimestamp(
                    self.start_time, tz=timezone.utc
                )
                end: datetime = datetime.fromtimestamp(self.end_time, tz=timezone.utc)

                print(f"Connection established start={start} end={end}")

                filtered_channels: list[TextChannel] = []
                async for guild in client.fetch_guilds():
                    if (server_ids is None) or (server_ids and guild.id in server_ids):
                        guild_channels = await guild.fetch_channels()
                        for channel in guild_channels:
                            print(channel.name)
                            if (
                                (channels is None)
                                or (channels and channel.name in channels)
                            ) and isinstance(channel, discord.TextChannel):
                                filtered_channels.append(channel)

                logger.info(
                    f"Found {len(filtered_channels)} channels for the authenticated user"
                )
                print(
                    f"Found {len(filtered_channels)} channels for the authenticated user"
                )

                sections: list[Section] = []
                for channel in filtered_channels:
                    # process the messages not in any thread
                    max_ts = start
                    sections = []
                    async for channel_message in channel.history(
                        limit=batch_size, after=start, before=end
                    ):  # TODO: pagination
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
                            limit=batch_size,
                            after=start,
                            before=end,
                        ):  # TODO: pagination
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
                    print("Total docs", len(docs))
            finally:
                print("Closing the connection")
                await self.close()

    intents = discord.Intents.default()
    intents.message_content = True
    client = DanswerDiscordClient(start, end, intents=intents)
    await client.start(token, reconnect=True)
    return docs


class DiscordConnector(PollConnector):
    def __init__(
        self,
        server_ids: list[str] | None = None,
        channels: list[str] | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
    ):
        self.channels: list[str] | None = channels
        self.server_ids: list[int] | None = (
            [int(server_id) for server_id in server_ids] if server_ids else None
        )
        self.batch_size = batch_size
        self.discord_bot_token = None

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.discord_bot_token = credentials["discord_bot_token"]
        intents = discord.Intents.default()
        intents.message_content = True
        self.client = discord.Client(intents=intents)
        return None

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        # if self.discord_bot_token is None:
        logger.info(self.server_ids)
        logger.info(self.channels)
        if self.discord_bot_token is None:
            raise ConnectorMissingCredentialError("Discord")

        # fetch all docs and yield
        # TODO: not sure how to convert this to a sync iterable ?!!
        for doc in asyncio.run(
            _fetch_all_docs(
                self.discord_bot_token,
                start,
                end,
                self.channels,
                self.server_ids,
                self.batch_size,
            )
        ):
            yield doc


if __name__ == "__main__":
    import os
    import time

    current = time.time()
    one_day_ago = current - 24 * 60 * 60 * 3  # 1 day

    connector = DiscordConnector(
        server_ids=["your-test-server-id"],
        channels=["your-test-channel-name"],
    )
    connector.load_credentials({"discord_bot_token": os.environ["discord_bot_token"]})

    for doc in connector.poll_source(one_day_ago, current):
        print(doc)
