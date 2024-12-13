from typing import TypedDict

from sqlalchemy.orm import Session

from danswer.context.search.models import SearchRequest
from danswer.llm.interfaces import LLM


class PrimaryState(TypedDict, total=False):
    search_request: SearchRequest
    primary_llm: LLM
    fast_llm: LLM
    # a single session for the entire agent search
    # is fine if we are only reading
    db_session: Session
