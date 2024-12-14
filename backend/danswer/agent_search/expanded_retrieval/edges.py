from collections.abc import Hashable

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs
from langgraph.types import Send

from danswer.agent_search.expanded_retrieval.nodes.doc_retrieval import RetrieveInput
from danswer.agent_search.expanded_retrieval.states import DocRetrievalOutput
from danswer.agent_search.expanded_retrieval.states import DocVerificationInput
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalInput
from danswer.agent_search.shared_graph_utils.prompts import (
    REWRITE_PROMPT_MULTI_ORIGINAL,
)
from danswer.llm.interfaces import LLM


def parallel_retrieval_edge(state: ExpandedRetrievalInput) -> list[Send | Hashable]:
    # print(f"parallel_retrieval_edge state: {state.keys()}")
    print("parallel_retrieval_edge state")

    # This should be better...
    question = state.get("query_to_answer") or state["search_request"].query
    llm: LLM = state["fast_llm"]

    """
    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]
    """
    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI_ORIGINAL.format(question=question),
        )
    ]

    llm_response_list = list(
        llm.stream(
            prompt=msg,
        )
    )
    llm_response = merge_message_runs(llm_response_list, chunk_separator="")[0].content

    # print(f"llm_response: {llm_response}")

    rewritten_queries = [
        rewritten_query.strip() for rewritten_query in llm_response.split("--")
    ]

    # Add the original sub-question as one of the 'rewritten' queries
    rewritten_queries = [question] + rewritten_queries

    print(f"rewritten_queries: {rewritten_queries}")

    return [
        Send(
            "doc_retrieval",
            RetrieveInput(query_to_retrieve=query, **state),
        )
        for query in rewritten_queries
    ]


def parallel_verification_edge(state: DocRetrievalOutput) -> list[Send | Hashable]:
    # print(f"parallel_retrieval_edge state: {state.keys()}")
    print("parallel_retrieval_edge state")

    retrieved_docs = state["retrieved_documents"]

    return [
        Send(
            "doc_verification",
            DocVerificationInput(doc_to_verify=doc, **state),
        )
        for doc in retrieved_docs
    ]


# this is not correct - remove
# def conditionally_rerank_edge(state: ExpandedRetrievalState) -> bool:
#    print(f"conditionally_rerank_edge state: {state.keys()}")
#    return bool(state["search_request"].rerank_settings)
