from urllib.parse import quote
from typing import Any
from typing import Generator
from typing import List, Tuple
from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger
from zulip import Client
from danswer.connectors.zulip.utils import call_api, build_search_narrow, encode_zulip_narrow_operand
from danswer.connectors.zulip.schemas import GetMessagesResponse, Message

logger = setup_logger()

class ZulipConnector(LoadConnector, PollConnector):
    def __init__(self, config_file: str, batch_size: int, realm_name: str, realm_url: str) -> None:
        self.client = Client(config_file=config_file)
        self.batch_size = batch_size
        self.realm_name = realm_name
        self.realm_url = realm_url if realm_url.endswith("/") else realm_url + "/"

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        if credentials:
            logger.warning("Unexpected credentials provided for Zulip Connector")
        return None
    
    def _message_to_narrow_link(self, m: Message) -> str:
        stream_name = m.display_recipient # assume str
        stream_operand = encode_zulip_narrow_operand(f"{m.stream_id}-{stream_name}")
        topic_operand = encode_zulip_narrow_operand(m.subject)

        narrow_link = (
            f"{self.realm_url}#narrow/stream/{stream_operand}/topic/{topic_operand}/near/{m.id}"
        )
        return narrow_link

    def _get_message_batch(self, anchor: str) -> Tuple[bool, List[Message]]:
        logger.info(
            f"Fetching messages starting with anchor={anchor}"
        )
        request = build_search_narrow(
            limit=INDEX_BATCH_SIZE, anchor=anchor, apply_md=False
        )
        response = GetMessagesResponse(**call_api(self.client.get_messages, request))

        end = False
        if len(response.messages) == 0 or response.found_oldest:
            end = True
        
        # reverse, so that the last message is the new anchor
        # and the order is from newest to oldest
        return (end, response.messages[::-1])
    
    def _message_to_doc(
        self, message: Message
    ) -> Document:
        return Document(
            id=f"{message.stream_id}__{message.id}",
            sections=[
                Section(
                    link=self._message_to_narrow_link(message),
                    text=message.content,
                )
            ],
            source=DocumentSource.ZULIP,
            semantic_identifier=message.display_recipient,
            metadata={},
        )
        
    def _get_docs(
        self, anchor: int | None = None, start: SecondsSinceUnixEpoch | None = None
    ) -> Generator[Document, None, None]:
        while True:
            end, message_batch = self._get_message_batch(anchor)
            
            for message in message_batch:
                if start is not None and float(message.timestamp) < start:
                    return
                yield self._message_to_doc(message)

            if end:
                return

            anchor = message.id

    def _poll_source(
        self, start: SecondsSinceUnixEpoch | None, end: SecondsSinceUnixEpoch | None
    ) -> GenerateDocumentsOutput:
        # Since Zulip doesn't support searching by timestamp, 
        # we have to always start from the newest message
        anchor = "newest"

        docs = []
        for doc in self._get_docs(anchor=anchor, start=start):
            docs.append(doc)
            if len(docs) == self.batch_size:
                yield docs
                docs = []
        if docs:
            yield docs

    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._poll_source(start=None, end=None)

    def poll_source(
        self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch
    ) -> GenerateDocumentsOutput:
        return self._poll_source(start, end)
