from pydantic import BaseModel

from danswer.configs.constants import DocumentSource
from danswer.search.models import RetrievalDetails


class BasicCreateChatMessageRequest(BaseModel):
    """Before creating messages, be sure to create a chat_session and get an id
    Note, for simplicity this option only allows for a single linear chain of messages
    """

    chat_session_id: int
    # New message contents
    message: str
    # Defaults to using retrieval with no additional filters
    retrieval_options: RetrievalDetails | None = None
    # Allows the caller to specify the exact search query they want to use
    # will disable Query Rewording if specified
    query_override: str | None = None
    # If no prompt provided, provide canned retrieval answer, no actually LLM flow
    # Use prompt_id 0 to use the system default prompt which is Answer-Question
    prompt_id: int | None = 0
    # If search_doc_ids provided, then retrieval options are unused
    search_doc_ids: list[int] | None = None


class SimpleDoc(BaseModel):
    semantic_identifier: str
    link: str | None
    blurb: str
    match_highlights: list[str]
    source_type: DocumentSource


class ChatBasicResponse(BaseModel):
    # This is built piece by piece, any of these can be None as the flow could break
    answer: str | None = None
    answer_citationless: str | None = None
    simple_search_docs: list[SimpleDoc] | None = None
    error_msg: str | None = None
