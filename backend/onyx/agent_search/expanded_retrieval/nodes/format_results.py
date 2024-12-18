from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalOutput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalResult
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def format_results(state: ExpandedRetrievalState) -> ExpandedRetrievalOutput:
    return ExpandedRetrievalOutput(
        expanded_retrieval_result=ExpandedRetrievalResult(
            expanded_queries_results=state["expanded_retrieval_results"],
            all_documents=state["reranked_documents"],
        ),
    )
