from onyx.agent_search.answer_question.states import RetrievalIngestionUpdate
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalOutput


def ingest_retrieval(state: ExpandedRetrievalOutput) -> RetrievalIngestionUpdate:
    return RetrievalIngestionUpdate(
        documents=state["documents"],
        expanded_retrieval_results=state["expanded_retrieval_results"],
    )
