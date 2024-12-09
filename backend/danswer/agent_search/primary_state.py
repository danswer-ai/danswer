from datetime import datetime
from typing import TypedDict

from sqlalchemy.orm import Session

from danswer.llm.interfaces import LLM


class PrimaryState(TypedDict):
    agent_search_start_time: datetime
    original_question: str
    primary_llm: LLM
    fast_llm: LLM
    # a single session for the entire agent search
    # is fine if we are only reading
    db_session: Session
