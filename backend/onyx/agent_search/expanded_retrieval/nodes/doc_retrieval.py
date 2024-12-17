from onyx.agent_search.expanded_retrieval.states import DocRetrievalOutput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState
from onyx.context.search.models import InferenceSection
from onyx.context.search.models import SearchRequest
from onyx.context.search.pipeline import SearchPipeline


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

    documents: list[InferenceSection] = []
    llm = state["primary_llm"]
    fast_llm = state["fast_llm"]
    query_to_retrieve = state["query_to_retrieve"]

    documents = SearchPipeline(
        search_request=SearchRequest(
            query=query_to_retrieve,
        ),
        user=None,
        llm=llm,
        fast_llm=fast_llm,
        db_session=state["db_session"],
    ).reranked_sections

    print(f"retrieved documents: {len(documents)}")
    return DocRetrievalOutput(
        retrieved_documents=documents[:4],
    )
