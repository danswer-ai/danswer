from onyx.agent_search.expanded_retrieval.states import DocRerankingUpdate
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def doc_reranking(state: ExpandedRetrievalState) -> DocRerankingUpdate:
    verified_documents = state["verified_documents"]
    reranked_documents = verified_documents

    return DocRerankingUpdate(reranked_documents=reranked_documents)
