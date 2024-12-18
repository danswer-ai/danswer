from onyx.agent_search.expanded_retrieval.states import DocRerankingOutput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def doc_reranking(state: ExpandedRetrievalState) -> DocRerankingOutput:
    print(f"doc_reranking state: {state.keys()}")

    original_question = state["search_request"].query
    current_question = state.get("query_to_answer", original_question)
    verified_documents = state["verified_documents"]
    reranked_documents = verified_documents

    retrieval_stats = state.get("retrieval_stats", [])

    ranking_scores = {}

    for type in ["reranked", "initial"]:
        ranking_scores[type] = 0
        for retrieval_stat in retrieval_stats:
            for _, stat in retrieval_stat.items():
                ranking_scores[type] += stat[type]["fit_score"]
        ranking_scores[type] /= len(retrieval_stats)

    if current_question != original_question:
        return DocRerankingOutput(
            documents=reranked_documents, ranking_scores=[ranking_scores]
        )

    else:
        return DocRerankingOutput(
            original_question_documents=reranked_documents,
            original_question_ranking_scores=[ranking_scores],
        )
