from onyx.agent_search.expanded_retrieval.states import DocRetrievalUpdate
from onyx.agent_search.expanded_retrieval.states import QueryResult
from onyx.agent_search.expanded_retrieval.states import RetrievalInput
from onyx.context.search.models import InferenceSection
from onyx.context.search.models import SearchRequest
from onyx.context.search.pipeline import SearchPipeline


def doc_retrieval(state: RetrievalInput) -> DocRetrievalUpdate:
    """
    Retrieve documents

    Args:
        state (RetrievalInput): Primary state + the query to retrieve

    Updates:
        expanded_retrieval_results: list[ExpandedRetrievalResult]
        retrieved_documents: list[InferenceSection]
    """

    llm = state["primary_llm"]
    fast_llm = state["fast_llm"]
    query_to_retrieve = state["query_to_retrieve"]

    documents: list[InferenceSection] = SearchPipeline(
        search_request=SearchRequest(
            query=query_to_retrieve,
        ),
        user=None,
        llm=llm,
        fast_llm=fast_llm,
        db_session=state["db_session"],
    ).reranked_sections

    expanded_retrieval_result = QueryResult(
        query=query_to_retrieve,
        documents_for_query=documents[:4],
        chunk_ids=[],
        stats={},
    )
    return DocRetrievalUpdate(
        expanded_retrieval_results=[expanded_retrieval_result],
        retrieved_documents=documents[:4],
    )
