import asyncio
from datetime import datetime
from datetime import timezone
from typing import Any
from typing import List
from typing import Optional
from typing import Union

import discord
from discord import DMChannel
from discord import GroupChannel
from discord import PartialMessageable
from discord import StageChannel
from discord import TextChannel
from discord import Thread
from discord import VoiceChannel

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger


logger = setup_logger()


class DiscordConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        channel_ids: List[int],
        discord_bot_token: Optional[str] = None,
        batch_size: int = INDEX_BATCH_SIZE,
    ) -> None:
        self.batch_size = batch_size
        self.discord_bot_token: Optional[str] = discord_bot_token
        self.channel_ids = channel_ids

    def load_credentials(self, credentials: dict[str, Any]) -> Optional[dict[str, Any]]:
        self.discord_bot_token = credentials.get("discord_bot_token")
        if not self.discord_bot_token:
            raise ValueError("Discord token is required in credentials")
        return None

    async def _fetch_messages(
        self,
        channel_id: int,
        after: Optional[Union[datetime, discord.Message]] = None,
        before: Optional[Union[datetime, discord.Message]] = None,
        limit: Optional[int] = 100,
    ) -> List[Document]:
        intents = discord.Intents.default()
        intents.message_content = True

        client = discord.Client(intents=intents)
        documents: List[Document] = []

        @client.event
        async def on_ready() -> None:
            try:
                channel = client.get_channel(channel_id)
                print(f"Channel is {channel}")
                if not isinstance(channel, TextChannel):
                    logger.error(f"Channel ID {channel_id} is not a text channel.")
                    await client.close()
                    return

                # Fetch messages
                messages = []
                async for message in channel.history(
                    limit=limit, after=after, before=before, oldest_first=True
                ):
                    messages.append(message)

                for message in messages:
                    # Process regular messages
                    doc = self._message_to_document(message)
                    documents.append(doc)

                    # Process thread messages if any
                    if message.thread:
                        thread = message.thread
                        thread_messages = []
                        async for thread_message in thread.history(
                            limit=None, oldest_first=True
                        ):
                            thread_doc = self._message_to_document(thread_message)
                            thread_messages.append(thread_doc)

                        documents.extend(thread_messages)
            except Exception as e:
                logger.exception(f"Error fetching messages: {e}")
            finally:
                await client.close()

        if self.discord_bot_token:
            print("Starting client")
            print(f"token is {self.discord_bot_token}")
            await client.start(self.discord_bot_token)
        else:
            raise ValueError("Discord token is not set")
        return documents

    def _message_to_document(self, message: discord.Message) -> Document:
        content = message.content
        if not content.strip():
            content = "[No text content]"

        timestamp = message.created_at.replace(tzinfo=timezone.utc)
        author_name = message.author.name
        channel_name = self._get_channel_name(message.channel)

        doc = Document(
            id=str(message.id),
            sections=[
                Section(link=message.jump_url, text=content),
            ],
            source=DocumentSource.DISCORD,
            semantic_identifier=f"Message in #{channel_name} by {author_name}",
            doc_updated_at=timestamp,
            metadata={
                "author": author_name,
                "channel": channel_name,
                "message_id": str(message.id),
                "channel_id": str(message.channel.id),
            },
        )
        return doc

    def _get_channel_name(
        self,
        channel: Union[
            TextChannel
            | VoiceChannel
            | StageChannel
            | Thread
            | DMChannel
            | PartialMessageable
            | GroupChannel
        ],
    ) -> str:
        if isinstance(channel, (TextChannel, VoiceChannel, StageChannel)):
            return channel.name
        elif isinstance(channel, DMChannel):
            return "Direct Message"
        elif isinstance(channel, GroupChannel):
            return "Group Message"
        else:
            return "Unknown Channel"

    def load_from_state(self) -> GenerateDocumentsOutput:
        if not self.discord_bot_token:
            raise ValueError(
                "Discord token is not loaded. Call load_credentials first."
            )

        for channel_id in self.channel_ids:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            documents = loop.run_until_complete(
                self._fetch_messages(channel_id=channel_id, limit=self.batch_size)
            )
            loop.close()
            if documents:
                yield documents

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        if not self.discord_bot_token:
            raise ValueError(
                "Discord token is not loaded. Call load_credentials first."
            )

        start_time = datetime.fromtimestamp(start, tz=timezone.utc)
        end_time = datetime.fromtimestamp(end, tz=timezone.utc)

        for channel_id in self.channel_ids:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            documents = loop.run_until_complete(
                self._fetch_messages(
                    channel_id=channel_id,
                    after=start_time,
                    before=end_time,
                    limit=None,  # No limit to get all messages in the time range
                )
            )
            loop.close()

            if documents:
                yield documents


if __name__ == "__main__":
    from os import environ

    bot_token = environ.get("DISCORD_BOT_TOKEN")
    channel_id = int(environ.get("DISCORD_CHANNEL_ID", "0"))
    connector = DiscordConnector(channel_ids=[channel_id])
    connector.load_credentials({"discord_bot_token": bot_token})

    for doc in connector.load_from_state():
        print(doc)
