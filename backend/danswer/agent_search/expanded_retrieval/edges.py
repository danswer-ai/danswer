from typing import Literal

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs
from langgraph.types import Send

from danswer.agent_search.expanded_retrieval.nodes.doc_retrieval import RetrieveInput
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalInput
from danswer.agent_search.expanded_retrieval.states import ExpandedRetrievalState
from danswer.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI
from danswer.llm.interfaces import LLM


def parallel_retrieval_edge(state: ExpandedRetrievalInput) -> Literal["doc_retrieval"]:
    """
    Transform the initial question into more suitable search queries.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with re-phrased question
    """

    print(f"parallel_retrieval_edge state: {state.keys()}")
    # messages = state["base_answer_messages"]
    question = state["query_to_answer"]
    llm: LLM = state["fast_llm"]

    msg = [
        HumanMessage(
            content=REWRITE_PROMPT_MULTI.format(question=question),
        )
    ]
    llm_response_list = list(
        llm.stream(
            prompt=msg,
        )
    )
    llm_response = merge_message_runs(llm_response_list, chunk_separator="")[0].content

    print(f"llm_response: {llm_response}")

    rewritten_queries = llm_response.split("\n")

    print(f"rewritten_queries: {rewritten_queries}")

    return [
        Send(
            "doc_retrieval",
            RetrieveInput(query_to_retrieve=query, **state),
        )
        for query in rewritten_queries
    ]


def conditionally_rerank_edge(state: ExpandedRetrievalState) -> bool:
    print(f"conditionally_rerank_edge state: {state.keys()}")
    return bool(state["search_request"].rerank_settings)
