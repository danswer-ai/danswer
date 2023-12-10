from pydantic import BaseModel

from danswer.direct_qa.interfaces import DanswerQuotes
from danswer.server.chat.models import QADocsResponse
from danswer.server.chat.models import RetrievalDetails


class DirectQARequest(BaseModel):
    query: str
    prompt_id: int | None  # TODO make this actually impact the qa model
    persona_id: int
    retrieval_options: RetrievalDetails


class OneShotQAResponse(BaseModel):
    # This is built piece by piece, any of these can be None as the flow could break
    answer: str | None = None
    quotes: DanswerQuotes | None = None
    docs: QADocsResponse | None = None
    error_msg: str | None = None
    chat_message_id: int | None = None
