from pydantic import BaseModel

from danswer.direct_qa.interfaces import DanswerQuotes
from danswer.server.chat.models import QADocsResponse
from danswer.server.chat.models import RetrievalDetails


class DirectQARequest(BaseModel):
    query: str
    prompt_id: int | None
    persona_id: int
    retrieval_options: RetrievalDetails
    chain_of_thought: bool = False


class OneShotQAResponse(BaseModel):
    # This is built piece by piece, any of these can be None as the flow could break
    answer: str | None = None
    quotes: DanswerQuotes | None = None
    docs: QADocsResponse | None = None
    llm_chunks_indices: list[int] | None = None
    error_msg: str | None = None
    answer_valid: bool = True  # Reflexion result, default True if Reflexion not run
    chat_message_id: int | None = None
