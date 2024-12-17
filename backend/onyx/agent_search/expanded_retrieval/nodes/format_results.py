from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalOutput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def format_results(state: ExpandedRetrievalState) -> ExpandedRetrievalOutput:
    return ExpandedRetrievalOutput(
        expanded_retrieval_results=state["expanded_retrieval_results"],
        documents=state["reranked_documents"],
    )
