from danswer.agent_search.expanded_retrieval.states import DocRetrievalOutput
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalState
from danswer.context.search.models import InferenceSection
from danswer.context.search.models import SearchRequest
from danswer.context.search.pipeline import SearchPipeline
from danswer.db.engine import get_session_context_manager


class RetrieveInput(ExpandedRetrievalState):
    query_to_retrieve: str


def doc_retrieval(state: RetrieveInput) -> DocRetrievalOutput:
    # def doc_retrieval(state: RetrieveInput) -> Command[Literal["doc_verification"]]:
    """
    Retrieve documents

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print(f"doc_retrieval state: {state.keys()}")

    state["query_to_retrieve"]

    documents: list[InferenceSection] = []
    llm = state["primary_llm"]
    fast_llm = state["fast_llm"]
    # db_session = state["db_session"]
    query_to_retrieve = state["search_request"].query
    with get_session_context_manager() as db_session1:
        documents = SearchPipeline(
            search_request=SearchRequest(
                query=query_to_retrieve,
            ),
            user=None,
            llm=llm,
            fast_llm=fast_llm,
            db_session=db_session1,
        ).reranked_sections

    print(f"retrieved documents: {len(documents)}")
    return DocRetrievalOutput(
        retrieved_documents=documents,
    )
