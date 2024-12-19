from typing import TypedDict
from typing import TypeVar

from sqlalchemy.orm import Session

from onyx.context.search.models import SearchRequest
from onyx.llm.interfaces import LLM


class CoreState(TypedDict, total=False):
    """
    This is the core state that is shared across all subgraphs.
    """

    search_request: SearchRequest
    primary_llm: LLM
    fast_llm: LLM
    # a single session for the entire agent search
    # is fine if we are only reading
    db_session: Session


# This ensures that the state passed in extends the CoreState
T = TypeVar("T", bound=CoreState)


def extract_core_fields(state: T) -> CoreState:
    filtered_dict = {k: v for k, v in state.items() if k in CoreState.__annotations__}
    return CoreState(**dict(filtered_dict))  # type: ignore
