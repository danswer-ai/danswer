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
    start: str,
    end: str,
    channels: List[str] | None,
    server_ids: List[int] | None,
    batch_size: int,
) -> AsyncIterable[List[Document]]:
    client = discord.Client()
    await client.start(token, reconnect=True)

    start = datetime.fromtimestamp(start, tz=timezone.utc)
    end = datetime.fromtimestamp(end, tz=timezone.utc)

    filtered_channels: list[TextChannel] = []
    async for guild in client.fetch_guilds():
        if (server_ids is None) or (server_ids and guild.id in server_ids):
            for channel in guild.channels:
                if (
                    (channels is None) or (channels and channel.name in channels)
                ) and isinstance(channel, discord.TextChannel):
                    permissions = channel.permissions_for(guild.me)
                    if permissions.read_messages:
                        filtered_channels.append(channel)

    logger.info(f"Found {len(filtered_channels)} channels for the authenticated user")

    docs: list[Document] = []
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
                max_ts = max(thread_message.edited_at, max_ts)
            if len(docs) >= batch_size:
                yield docs
                docs = []
            docs.append(
                Document(
                    id=thread_message.id,
                    source=DocumentSource.DISCORD,
                    semantic_identifier=f"{thread.name} in {channel.name}",
                    doc_updated_at=max_ts,
                    title=thread.name,
                    section=sections,
                    metadata={"Channel": channel.name, "Thread": thread.name},
                )
            )


class DiscordConnector(PollConnector):
    def __init__(
        self,
        server_ids: list[int] | None = None,
        channels: list[str] | None = None,
        batch_size: int = INDEX_BATCH_SIZE,
    ):
        self.channels: list[str] | None = channels
        self.server_ids: list[str] | None = (
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
        return _fetch_all_docs(
            self.discord_bot_token,
            start,
            end,
            self.channels,
            self.server_ids,
            self.batch_size,
        )


if __name__ == "__main__":
    import os
    import time

    connector = DiscordConnector(
        server_ids=None,
        channels=None,
    )
    connector.load_credentials({"discord_bot_token": os.environ["discord_bot_token"]})

    current = time.time()
    one_day_ago = current - 24 * 60 * 60  # 1 day

    document_batches = connector.poll_source(one_day_ago, current)

    print(next(document_batches))
