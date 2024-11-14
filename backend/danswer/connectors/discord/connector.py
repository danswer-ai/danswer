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
                        for channel in guild.channels:
                            if (
                                (channels is None)
                                or (channels and channel.name in channels)
                            ) and isinstance(channel, discord.TextChannel):
                                permissions = channel.permissions_for(guild.me)
                                if permissions.read_messages:
                                    filtered_channels.append(channel)

                logger.info(
                    f"Found {len(filtered_channels)} channels for the authenticated user"
                )
                print(
                    f"Found {len(filtered_channels)} channels for the authenticated user"
                )

                for channel in filtered_channels:
                    for thread in channel.threads:
                        sections: list[Section] = []
                        max_ts = start
                        async for thread_message in thread.history(
                            limit=batch_size,
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
                    print(len(docs))
            finally:
                await self.close()

    intents = discord.Intents.default()
    intents.message_content = True
    client = DanswerDiscordClient(start, end, intents=intents)
    await client.start(token, reconnect=True)
    print("docs", docs)
    return docs


class DiscordConnector(PollConnector):
    def __init__(
        self,
        server_ids: list[int] | None = None,
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

    # print(
    #     asyncio.get_event_loop().run_until_complete(
    #         _fetch_all_docs(
    #             os.environ["discord_bot_token"],
    #             one_day_ago,
    #             current,
    #             None,
    #             None,
    #             10,
    #         )
    #     )
    # )

    connector = DiscordConnector(
        server_ids=None,
        channels=None,
    )
    connector.load_credentials({"discord_bot_token": os.environ["discord_bot_token"]})

    document_batches = connector.poll_source(one_day_ago, current)

    print(next(document_batches))
