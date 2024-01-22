import os
from datetime import datetime
from datetime import timezone
from typing import Any, List, Optional
import asyncio
import logging
logger = logging.getLogger(__name__)
from typing import cast
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.miscellaneous_utils import time_str_to_utc
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger
import discord 

async def read_channel(
        token: str,
        channel_id: int,
        limit: INDEX_BATCH_SIZE,
        oldest: True,
        before : Optional[int or datetime],
        after : Optional[int or datetime],
    ) -> List:

    messages = []

    class Client(discord.Client):
        async def on_ready(self) -> None:
            try:
                logger.info(f"{self.user} has connected to Discord!")
                channel = client.get_channel(channel_id)
                if type(channel) != discord.TextChannel:
                    raise ValueError(f"The Channel ID provided is not a text channel")
                threads = {}
                for thread in channel.threads:
                    threads[thread.id] = thread
                if type(before) == datetime:
                    before_msg = before
                else:
                    before_msg = None
                if type(after) == str:
                    after_msg = await channel.fetch_message(after)
                elif type(after) == datetime:
                    after_msg = after
                else:
                    after_msg = None
                async for message in channel.history(limit=limit, oldest_first=oldest, before=before_msg, after=after_msg):
                    if message.id in threads:
                        thread = threads[message.id]
                        curr_thread_messages = []
                        async for thread_msg in thread.history(limit=limit, oldest_first=oldest):
                            section = Section(
                                    link=thread_msg.jump_url,
                                    text=thread_msg.content
                                )
                            curr_thread_messages.append(section)
                        messages.append({"Thread" : curr_thread_messages})
                    else:
                        document_to_append = Document(
                            id=str(message.id),
                            sections=[Section(link=message.jump_url, text=message.content)],
                            source=DocumentSource.DISCORD,
                            semantic_identifier=message.jump_url,
                            doc_updated_at=message.created_at,
                            metadata={"channel_id" : str(message.channel.id)},
                        )
                        messages.append({"Regular" : document_to_append})
            except Exception as exception:
                logger.error("Error Exception: " + str(exception))
            finally:
                await self.close()
    intents = discord.Intents.default()
    intents.message_content = True
    client = Client(intents=intents)
    await client.start(token)
    return messages


class DiscordConnector(LoadConnector, PollConnector):
    def __init__(self, batch_size: int = INDEX_BATCH_SIZE) -> None:
        self.batch_size = batch_size
        self.discord_token: str | None = None
    
    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        self.discord_token = cast(str, credentials['discord_token'])
        return None
    
    def _execute_read_channel(self, channel_id: int, limit: Optional[int], oldest: bool, before = Optional[int or datetime], after = Optional[int or datetime]) -> List:
        return asyncio.get_event_loop().run_until_complete(
            read_channel(
                self.discord_token, channel_id, limit=limit, oldest=True, before=before, after=after
            )
        )
    
    def load_from_state(self, channel_id) -> GenerateDocumentsOutput:
        has_more = True
        messages = []
        cursor = None
        while has_more:
            messages = self._execute_read_channel(channel_id=channel_id, limit=self.batch_size, oldest=True, before= None, after=cursor)
            if messages == []:
                has_more = False
                messages.append(messages)
                print(f"Reached End of Channel")
                yield messages
            else:
                if list(messages[-1].keys()) == ['Regular']:
                    cursor = messages[-1]['Regular'].id
                    messages.append(messages)
                    yield messages
                elif list(messages[-1].keys()) == ['Thread']:
                    cursor = messages[-1]['Thread'].id
                    messages.append(messages)
                    yield messages                    

    
    def poll_source(
        self, channel_id, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        end_time = datetime.fromtimestamp(end, tz=timezone.utc)
        has_more = True
        cursor = datetime.fromtimestamp(start, tz=timezone.utc)
        messages = []
        while has_more:
            messages = self._execute_read_channel(channel_id=channel_id, limit=self.batch_size, oldest=True, before=end_time, after=cursor)
            if messages == []:
                has_more = False
                messages.append(messages)
                print(f"Reached End of Channel")
                yield messages
            else:
                if list(messages[-1].keys()) == ['Regular']:
                    cursor = messages[-1]['Regular'].id
                    messages.append(messages)
                    yield messages
                elif list(messages[-1].keys()) == ['Thread']:
                    cursor = messages[-1]['Thread'].id
                    messages.append(messages)
                    yield messages   

if __name__ == "__main__":
    connector = DiscordConnector(batch_size=16)
    connector.load_credentials({"discord_token": os.environ["discord_token"]})
    document_batches = connector.poll_source(1197318454747873402, start=1705533366.652, end=1705533412.843)
    print("Batch 1: ", next(document_batches))
    print("Batch 2: ", next(document_batches))
