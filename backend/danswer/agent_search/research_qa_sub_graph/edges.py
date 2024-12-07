from collections.abc import Hashable
from typing import Union

from langgraph.types import Send

from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.primary_graph.states import VerifierState
from danswer.agent_search.research_qa_sub_graph.states import ResearchQAState


def sub_continue_to_verifier(state: ResearchQAState) -> Union[Hashable, list[Hashable]]:
    # Routes each de-douped retrieved doc to the verifier step - in parallel
    # Notice the 'Send()' API that takes care of the parallelization

    return [
        Send(
            "sub_verifier",
            VerifierState(
                document=doc,
                question=state["sub_question"],
                primary_llm=state["primary_llm"],
                fast_llm=state["fast_llm"],
                graph_start_time=state["graph_start_time"],
            ),
        )
        for doc in state["sub_question_base_retrieval_docs"]
    ]


def sub_continue_to_retrieval(
    state: ResearchQAState,
) -> Union[Hashable, list[Hashable]]:
    # Routes re-written queries to the (parallel) retrieval steps
    # Notice the 'Send()' API that takes care of the parallelization
    return [
        Send(
            "sub_custom_retrieve",
            RetrieverState(
                rewritten_query=query,
                primary_llm=state["primary_llm"],
                fast_llm=state["fast_llm"],
                graph_start_time=state["graph_start_time"],
            ),
        )
        for query in state["sub_question_rewritten_queries"]
    ]
