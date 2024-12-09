from collections.abc import Hashable

from langgraph.types import Send

from danswer.agent_search.deep_qa_graph.states import ResearchQAState
from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.primary_graph.states import VerifierState


def continue_to_verifier(state: ResearchQAState) -> list[Hashable]:
    # Routes each de-douped retrieved doc to the verifier step - in parallel
    # Notice the 'Send()' API that takes care of the parallelization

    return [
        Send(
            "sub_verifier",
            VerifierState(
                document=doc,
                question=state["sub_question"],
                graph_start_time=state["graph_start_time"],
            ),
        )
        for doc in state["sub_question_base_retrieval_docs"]
    ]


def continue_to_retrieval(
    state: ResearchQAState,
) -> list[Hashable]:
    # Routes re-written queries to the (parallel) retrieval steps
    # Notice the 'Send()' API that takes care of the parallelization
    return [
        Send(
            "sub_custom_retrieve",
            RetrieverState(
                rewritten_query=query,
                graph_start_time=state["graph_start_time"],
            ),
        )
        for query in state["sub_question_rewritten_queries"]
    ]
