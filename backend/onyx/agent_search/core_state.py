from typing import TypedDict
from typing import TypeVar

from sqlalchemy.orm import Session

from onyx.context.search.models import SearchRequest
from onyx.llm.interfaces import LLM


class PrimaryState(TypedDict, total=False):
    search_request: SearchRequest
    primary_llm: LLM
    fast_llm: LLM
    # a single session for the entire agent search
    # is fine if we are only reading
    db_session: Session


# This ensures that the state passed in extends the PrimaryState
T = TypeVar("T", bound=PrimaryState)


def extract_primary_fields(state: T) -> PrimaryState:
    filtered_dict = {
        k: v for k, v in state.items() if k in PrimaryState.__annotations__
    }
    return PrimaryState(**dict(filtered_dict))  # type: ignore
