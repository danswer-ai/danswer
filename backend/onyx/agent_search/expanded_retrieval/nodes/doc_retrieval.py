from onyx.agent_search.expanded_retrieval.states import DocRetrievalUpdate
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalResult
from onyx.agent_search.expanded_retrieval.states import RetrievalInput
from onyx.context.search.models import InferenceSection
from onyx.context.search.models import SearchRequest
from onyx.context.search.pipeline import SearchPipeline


def doc_retrieval(state: RetrievalInput) -> DocRetrievalUpdate:
    # def doc_retrieval(state: RetrieveInput) -> Command[Literal["doc_verification"]]:
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

    print(f"retrieved documents: {len(documents)}")
    expanded_retrieval_result = ExpandedRetrievalResult(
        expanded_query=query_to_retrieve,
        expanded_retrieval_documents=documents[:4],
    )
    return DocRetrievalUpdate(
        expanded_retrieval_results=[expanded_retrieval_result],
        retrieved_documents=documents[:4],
    )
