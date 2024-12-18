from onyx.agent_search.expanded_retrieval.states import DocRetrievalOutput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState
from onyx.agent_search.shared_graph_utils.operators import calculate_rank_shift
from onyx.context.search.models import InferenceSection
from onyx.context.search.models import SearchRequest
from onyx.context.search.pipeline import SearchPipeline
from onyx.db.engine import get_session_context_manager


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

    documents: list[InferenceSection] = []
    llm = state["primary_llm"]
    fast_llm = state["fast_llm"]
    # db_session = state["db_session"]
    query_to_retrieve = state["query_to_retrieve"]
    with get_session_context_manager() as db_session1:
        documents = SearchPipeline(
            search_request=SearchRequest(
                query=query_to_retrieve,
            ),
            user=None,
            llm=llm,
            fast_llm=fast_llm,
            db_session=db_session1,
        )

        ranked_sections = {
            "initial": documents.final_context_sections,
            "reranked": documents.reranked_sections,
        }

        fit_scores = {}

        for rank_type, docs in ranked_sections.items():
            fit_scores[rank_type] = {}
            for i in [1, 5, 10]:
                fit_scores[rank_type][i] = (
                    sum([doc.center_chunk.score for doc in docs[:i]]) / i
                )

            fit_scores[rank_type]["fit_score"] = (
                1
                / 3
                * (
                    fit_scores[rank_type][1]
                    + fit_scores[rank_type][5]
                    + fit_scores[rank_type][10]
                )
            )
            fit_scores[rank_type]["chunk_ids"] = [
                doc.center_chunk.chunk_id for doc in docs
            ]

        fit_score_lift = (
            fit_scores["reranked"]["fit_score"] / fit_scores["initial"]["fit_score"]
        )

        average_rank_change = calculate_rank_shift(
            fit_scores["initial"]["chunk_ids"], fit_scores["reranked"]["chunk_ids"]
        )

        fit_scores["rerank_effect"] = average_rank_change
        fit_scores["fit_score_lift"] = fit_score_lift

    documents = documents.reranked_sections[:4]

    print(f"retrieved documents: {len(documents)}")
    return DocRetrievalOutput(
        retrieved_documents=documents,
        retrieval_stats=[
            {
                query_to_retrieve: fit_scores,
            }
        ],
    )
