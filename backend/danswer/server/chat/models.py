from datetime import datetime
from typing import Any

from pydantic import BaseModel
from pydantic import root_validator

from danswer.configs.constants import DocumentSource
from danswer.configs.constants import MessageType
from danswer.configs.constants import SearchFeedbackType
from danswer.direct_qa.interfaces import DanswerAnswer
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.search.models import BaseFilters
from danswer.search.models import OptionalSearchSetting
from danswer.search.models import QueryFlow
from danswer.search.models import SearchType


class SimpleQueryRequest(BaseModel):
    query: str


class ChatSessionCreationRequest(BaseModel):
    persona_id: int = 1  # If not specified, use Danswer default persona


class HelperResponse(BaseModel):
    values: dict[str, str]
    details: list[str] | None = None


class SearchDoc(BaseModel):
    document_id: str
    chunk_ind: int
    semantic_identifier: str
    link: str | None
    blurb: str
    source_type: DocumentSource
    boost: int
    # Whether the document is hidden when doing a standard search
    # since a standard search will never find a hidden doc, this can only ever
    # be `True` when doing an admin search
    hidden: bool
    score: float | None
    # Matched sections in the doc. Uses Vespa syntax e.g. <hi>TEXT</hi>
    # to specify that a set of words should be highlighted. For example:
    # ["<hi>the</hi> <hi>answer</hi> is 42", "the answer is <hi>42</hi>""]
    match_highlights: list[str]
    # when the doc was last updated
    updated_at: datetime | None
    primary_owners: list[str] | None
    secondary_owners: list[str] | None

    def dict(self, *args: list, **kwargs: dict[str, Any]) -> dict[str, Any]:  # type: ignore
        initial_dict = super().dict(*args, **kwargs)  # type: ignore
        initial_dict["updated_at"] = (
            self.updated_at.isoformat() if self.updated_at else None
        )
        return initial_dict


class RetrievalDocs(BaseModel):
    top_documents: list[SearchDoc]


class SearchResponse(RetrievalDocs):
    llm_indices: list[int]


# First chunk of info for streaming QA
class QADocsResponse(RetrievalDocs):
    predicted_flow: QueryFlow | None
    predicted_search: SearchType | None
    time_cutoff: datetime | None
    recency_bias_multiplier: float

    def dict(self, *args: list, **kwargs: dict[str, Any]) -> dict[str, Any]:  # type: ignore
        initial_dict = super().dict(*args, **kwargs)  # type: ignore
        initial_dict["time_cutoff"] = (
            self.time_cutoff.isoformat() if self.time_cutoff else None
        )
        return initial_dict


# Second chunk of info for streaming QA
class LLMRelevanceFilterResponse(BaseModel):
    relevant_chunk_indices: list[int]


class CreateChatSessionID(BaseModel):
    chat_session_id: int


class ChatFeedbackRequest(BaseModel):
    chat_message_id: int
    is_positive: bool | None = None
    feedback_text: str | None = None

    @root_validator
    def check_is_positive_or_feedback_text(cls: BaseModel, values: dict) -> dict:
        is_positive, feedback_text = values.get("is_positive"), values.get(
            "feedback_text"
        )

        if is_positive is None and feedback_text is None:
            raise ValueError("Empty feedback received.")

        return values


# Formerly NewMessageRequest
class RetrievalDetails(BaseModel):
    # Use LLM to determine whether to do a retrieval or only rely on existing history
    # If the Persona is configured to not run search (0 chunks), this is bypassed
    # If no Prompt is configured, the only search results are shown, this is bypassed
    run_search: OptionalSearchSetting
    # Is this a real-time/streaming call or a question where Danswer can take more time?
    # Used to determine reranking flow
    real_time: bool
    # The following have defaults in the Persona settings which can be overriden via
    # the query, if None, then use Persona settings
    filters: BaseFilters | None = None
    enable_auto_detect_filters: bool | None = None
    # TODO Pagination/Offset options
    # offset: int | None = None


class DocumentSearchRequest(BaseModel):
    message: str
    search_type: SearchType
    retrieval_options: RetrievalDetails
    recency_bias_multiplier: float = 1.0
    skip_rerank: bool = False


class CreateChatMessageRequest(BaseModel):
    chat_session_id: int
    parent_message_id: int | None
    message: str
    # If no prompt provided, provide canned retrieval answer, no actually LLM flow
    prompt_id: int | None
    # If search_doc_ids provided, then retrieval options are unused
    search_doc_ids: list[int] | None
    retrieval_options: RetrievalDetails | None

    @root_validator
    def check_search_doc_ids_or_retrieval_options(cls: BaseModel, values: dict) -> dict:
        search_doc_ids, retrieval_options = values.get("search_doc_ids"), values.get(
            "retrieval_options"
        )

        if search_doc_ids is None and retrieval_options is None:
            raise ValueError(
                "Either search_doc_ids or retrieval_options must be provided, but not both None."
            )

        return values


class ChatMessageIdentifier(BaseModel):
    message_id: int


class RegenerateMessageRequest(ChatMessageIdentifier):
    persona_id: int | None


class ChatRenameRequest(BaseModel):
    chat_session_id: int
    name: str | None
    first_message: str | None


class RenameChatSessionResponse(BaseModel):
    new_name: str  # This is only really useful if the name is generated


class ChatSession(BaseModel):
    id: int
    name: str
    time_created: str


class ChatSessionsResponse(BaseModel):
    sessions: list[ChatSession]


class SearchFeedbackRequest(BaseModel):
    message_id: int
    document_id: str
    document_rank: int
    click: bool
    search_feedback: SearchFeedbackType | None

    @root_validator
    def check_click_or_search_feedback(cls: BaseModel, values: dict) -> dict:
        click, feedback = values.get("click"), values.get("search_feedback")

        if click is False and feedback is None:
            raise ValueError("Empty feedback received.")

        return values


class ChatMessageDetail(BaseModel):
    message_id: int
    parent_message: int | None
    latest_child_message: int | None
    message: str
    context_docs: RetrievalDocs | None
    message_type: MessageType
    time_sent: datetime

    def dict(self, *args: list, **kwargs: dict[str, Any]) -> dict[str, Any]:  # type: ignore
        initial_dict = super().dict(*args, **kwargs)  # type: ignore
        initial_dict["time_sent"] = self.time_sent.isoformat()
        return initial_dict


class ChatSessionDetailResponse(BaseModel):
    chat_session_id: int
    description: str
    messages: list[ChatMessageDetail]


class QueryValidationResponse(BaseModel):
    reasoning: str
    answerable: bool


class AdminSearchRequest(BaseModel):
    query: str
    filters: BaseFilters


class AdminSearchResponse(BaseModel):
    documents: list[SearchDoc]


class QAResponse(SearchResponse, DanswerAnswer):
    quotes: list[DanswerQuote] | None
    predicted_flow: QueryFlow
    predicted_search: SearchType
    eval_res_valid: bool | None = None
    llm_chunks_indices: list[int] | None = None
    error_msg: str | None = None
