from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalOutput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState
from onyx.agent_search.expanded_retrieval.states import RetrievalResult


def format_results(state: ExpandedRetrievalState) -> ExpandedRetrievalOutput:
    return ExpandedRetrievalOutput(
        retrieval_results=[
            RetrievalResult(
                starting_query=state["starting_query"],
                expanded_retrieval_results=state["expanded_retrieval_results"],
                documents=state["reranked_documents"],
            )
        ],
    )
