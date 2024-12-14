import datetime

from danswer.agent_search.expanded_retrieval.states import DocRerankingOutput
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalState


def doc_reranking(state: ExpandedRetrievalState) -> DocRerankingOutput:
    print(f"doc_reranking state: {datetime.datetime.now()}")

    verified_documents = state["verified_documents"]
    reranked_documents = verified_documents

    return DocRerankingOutput(reranked_documents=reranked_documents)
