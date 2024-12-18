from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from onyx.agent_search.expanded_retrieval.states import ExpandedRetrievalInput
from onyx.agent_search.expanded_retrieval.states import QueryExpansionUpdate
from onyx.agent_search.shared_graph_utils.prompts import REWRITE_PROMPT_MULTI_ORIGINAL
from onyx.llm.interfaces import LLM


def expand_queries(state: ExpandedRetrievalInput) -> QueryExpansionUpdate:
    question = state.get("question")
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

    rewritten_queries = llm_response.split("--")

    return QueryExpansionUpdate(
        expanded_queries=rewritten_queries,
    )
