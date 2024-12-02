from langgraph.types import Send

from danswer.agent_search.primary_graph.states import QAState


def continue_to_retrieval(state: QAState) -> list[Send]:
    # Routes re-written queries to the (parallel) retrieval steps
    # Notice the 'Send()' API that takes care of the parallelization
    return [
        Send("custom_retrieve", {"query": query})
        for query in state["rewritten_queries"]
    ]


def continue_to_answer_sub_questions(state: QAState) -> list[Send]:
    # Routes re-written queries to the (parallel) retrieval steps
    # Notice the 'Send()' API that takes care of the parallelization
    return [
        Send("sub_answers_graph", {"base_answer_sub_question": sub_question})
        for sub_question in state["sub_questions"]
    ]


def continue_to_verifier(state: QAState) -> list[Send]:
    # Routes each de-douped retrieved doc to the verifier step - in parallel
    # Notice the 'Send()' API that takes care of the parallelization

    return [
        Send(
            "verifier",
            {"document": doc, "original_question": state["original_question"]},
        )
        for doc in state["deduped_retrieval_docs"]
    ]
