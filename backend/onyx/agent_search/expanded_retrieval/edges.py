from collections.abc import Hashable

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs
from langgraph.types import Send

from onyx.agent_search.expanded_retrieval.nodes.doc_retrieval import RetrieveInput
from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalInput
from onyx.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI_ORIGINAL
from onyx.llm.interfaces import LLM


def parallel_retrieval_edge(state: ExpandedRetrievalInput) -> list[Send | Hashable]:
    print(f"parallel_retrieval_edge state: {state.keys()}")

    # This should be better...
    question = state.get("query_to_answer") or state["search_request"].query
    llm: LLM = state["fast_llm"]

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

    print(f"llm_response: {llm_response}")

    rewritten_queries = llm_response.split("--")

    print(f"rewritten_queries: {rewritten_queries}")

    return [
        Send(
            "doc_retrieval",
            RetrieveInput(query_to_retrieve=query, **state),
        )
        for query in rewritten_queries
    ]
