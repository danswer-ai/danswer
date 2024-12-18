from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalOutput
from onyx.agent_search.main.states import ExpandedRetrievalUpdate


def ingest_initial_retrieval(state: ExpandedRetrievalOutput) -> ExpandedRetrievalUpdate:
    return ExpandedRetrievalUpdate(
        all_original_question_documents=state["documents"],
        original_question_retrieval_results=state["expanded_retrieval_results"],
    )
