from pydantic import BaseModel

from danswer.direct_qa.interfaces import DanswerQuote
from danswer.server.chat.models import RetrievalDetails, QADocsResponse, LLMRelevanceFilterResponse


class DirectQARequest(BaseModel):
    query: str
    prompt_id: int | None  # TODO make this actually impact the qa model
    persona_id: int
    retrieval_options: RetrievalDetails


class OneShotQAResponse(QADocsResponse, LLMRelevanceFilterResponse):
    answer: str | None
    quotes: list[DanswerQuote] | None
    error_msg: str | None = None
    chat_message_id: int
