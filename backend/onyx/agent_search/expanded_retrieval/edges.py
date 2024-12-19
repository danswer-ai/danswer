from collections.abc import Hashable

from langgraph.types import Send

from onyx.agent_search.core_state import extract_core_fields
from onyx.agent_search.expanded_retrieval.nodes.doc_retrieval import RetrievalInput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def parallel_retrieval_edge(state: ExpandedRetrievalState) -> list[Send | Hashable]:
    return [
        Send(
            "doc_retrieval",
            RetrievalInput(
                query_to_retrieve=query,
                **extract_core_fields(state),
            ),
        )
        for query in state["expanded_queries"]
    ]
