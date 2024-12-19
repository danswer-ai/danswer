from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalOutput
from onyx.agent_search.main.states import ExpandedRetrievalUpdate


def ingest_initial_retrieval(state: ExpandedRetrievalOutput) -> ExpandedRetrievalUpdate:
    return ExpandedRetrievalUpdate(
        original_question_retrieval_results=state[
            "expanded_retrieval_result"
        ].expanded_queries_results,
        all_original_question_documents=state[
            "expanded_retrieval_result"
        ].all_documents,
    )
