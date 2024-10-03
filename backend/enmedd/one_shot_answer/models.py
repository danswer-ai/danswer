from typing import Any
from typing import Dict
from typing import List
from typing import Optional

from pydantic import BaseModel
from pydantic import Field
from pydantic import model_validator

from enmedd.chat.models import CitationInfo
from enmedd.chat.models import EnmeddContexts
from enmedd.chat.models import EnmeddQuotes
from enmedd.chat.models import QADocsResponse
from enmedd.configs.constants import MessageType
from enmedd.search.models import ChunkContext
from enmedd.search.models import RetrievalDetails


class QueryRephrase(BaseModel):
    rephrased_query: str


class ThreadMessage(BaseModel):
    message: str
    sender: str | None
    role: MessageType = MessageType.USER


class DirectQARequest(ChunkContext):
    messages: List[ThreadMessage]
    prompt_id: Optional[int] = None
    assistant_id: int
    retrieval_options: RetrievalDetails = Field(default_factory=RetrievalDetails)
    skip_rerank: Optional[bool] = None  # Forcibly skip (or run) the step
    skip_llm_chunk_filter: Optional[bool] = None
    chain_of_thought: bool = False
    return_contexts: bool = False

    @model_validator(mode="before")
    def check_chain_of_thought_and_prompt_id(
        cls, values: Dict[str, Any]
    ) -> Dict[str, Any]:
        chain_of_thought = values.get("chain_of_thought")
        prompt_id = values.get("prompt_id")

        if chain_of_thought and prompt_id is not None:
            raise ValueError(
                "If chain_of_thought is True, prompt_id must be None. "
                "The chain of thought prompt is only for question answering "
                "and does not accept customizing."
            )

        return values


class OneShotQAResponse(BaseModel):
    # This is built piece by piece, any of these can be None as the flow could break
    answer: str | None = None
    rephrase: str | None = None
    quotes: EnmeddQuotes | None = None
    citations: list[CitationInfo] | None = None
    docs: QADocsResponse | None = None
    llm_chunks_indices: list[int] | None = None
    error_msg: str | None = None
    answer_valid: bool = True  # Reflexion result, default True if Reflexion not run
    chat_message_id: int | None = None
    contexts: EnmeddContexts | None = None
