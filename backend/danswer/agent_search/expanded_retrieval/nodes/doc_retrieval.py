import datetime

from danswer.agent_search.expanded_retrieval.states import DocRetrievalOutput
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalState
from danswer.context.search.models import InferenceSection
from danswer.context.search.models import SearchRequest
from danswer.context.search.pipeline import SearchPipeline


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
    # print(f"doc_retrieval state: {state.keys()}")

    if "query_to_answer" in state.keys():
        query_question = state["query_to_answer"]
    else:
        query_question = state["search_request"].query

    query_to_retrieve = state["query_to_retrieve"]

    print(f"\ndoc_retrieval state: {datetime.datetime.now()}")
    print(f"  -- search_request: {query_question[:100]}")
    # print(f"       -- query_to_retrieve: {query_to_retrieve[:100]}")

    documents: list[InferenceSection] = []
    llm = state["primary_llm"]
    fast_llm = state["fast_llm"]
    # db_session = state["db_session"]

    documents = SearchPipeline(
        search_request=SearchRequest(
            query=query_to_retrieve,
        ),
        user=None,
        llm=llm,
        fast_llm=fast_llm,
        db_session=state["db_session"],
    ).reranked_sections

    top_1_score = documents[0].center_chunk.score
    top_5_score = sum([doc.center_chunk.score for doc in documents[:5]]) / 5
    top_10_score = sum([doc.center_chunk.score for doc in documents[:10]]) / 10

    fit_score = 1 / 3 * (top_1_score + top_5_score + top_10_score)

    # temp - limit the number of documents to 5
    documents = documents[:5]

    """
    chunk_ids = {
        "query": query_to_retrieve,
        "chunk_ids": [doc.center_chunk.chunk_id for doc in documents],
    }
    """

    print(f"sub_query: {query_to_retrieve[:50]}")
    print(f"retrieved documents: {len(documents)}")
    print(f"fit score: {fit_score}")
    print()
    return DocRetrievalOutput(
        retrieved_documents=documents,
    )
