from onyx.agent_search.expanded_retrieval.states import DocRerankingOutput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def doc_reranking(state: ExpandedRetrievalState) -> DocRerankingOutput:
    print(f"doc_reranking state: {state.keys()}")

    original_question = state["search_request"].query
    current_question = state.get("query_to_answer", original_question)
    verified_documents = state["verified_documents"]
    reranked_documents = verified_documents

    if current_question != original_question:
        return DocRerankingOutput(documents=reranked_documents)

    else:
        return DocRerankingOutput(original_question_documents=reranked_documents)
