from collections.abc import Hashable
from typing import Union

from langgraph.types import Send

from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.primary_graph.states import VerifierState


def sub_continue_to_verifier(state: BaseQAState) -> Union[Hashable, list[Hashable]]:
    # Routes each de-douped retrieved doc to the verifier step - in parallel
    # Notice the 'Send()' API that takes care of the parallelization

    return [
        Send(
            "sub_verifier",
            VerifierState(
                document=doc,
                #question=state["original_question"],
                question=state["sub_question_str"],
                graph_start_time=state["graph_start_time"],
            ),
        )
        for doc in state["sub_question_deduped_retrieval_docs"]
    ]


def sub_continue_to_retrieval(state: BaseQAState) -> Union[Hashable, list[Hashable]]:
    # Routes re-written queries to the (parallel) retrieval steps
    # Notice the 'Send()' API that takes care of the parallelization
    rewritten_queries = state["sub_question_search_queries"].rewritten_queries + [state["sub_question_str"]]
    return [
        Send(
            "sub_custom_retrieve",
            RetrieverState(
                rewritten_query=query,
                graph_start_time=state["graph_start_time"],
            ),
        )
        for query in rewritten_queries
    ]
