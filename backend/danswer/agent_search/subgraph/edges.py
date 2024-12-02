from langgraph.types import Send

from danswer.agent_search.primary_graph.states import QAState


def sub_continue_to_verifier(qa_state: QAState) -> list[Send]:
    # Routes each de-douped retrieved doc to the verifier step - in parallel
    # Notice the 'Send()' API that takes care of the parallelization

    return [
        Send(
            "verifier",
            {"document": doc, "question": qa_state["sub_question"]},
        )
        for doc in qa_state["sub_question_base_retrieval_docs"]
    ]


def sub_continue_to_retrieval(qa_state: QAState) -> list[Send]:
    # Routes re-written queries to the (parallel) retrieval steps
    # Notice the 'Send()' API that takes care of the parallelization
    return [
        Send("sub_custom_retrieve", {"rewritten_query": query})
        for query in qa_state["sub_question_rewritten_queries"]
    ]
