from datetime import datetime
from typing import Any

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def final_stuff(state: QAState) -> dict[str, Any]:
    """
    Invokes the agent model to generate a response based on the current state. Given
    the question, it will decide to retrieve using the retriever tool, or simply end.

    Args:
        state (messages): The current state

    Returns:
        dict: The updated state with the agent response appended to messages
    """
    print("---FINAL---")
    node_start_time = datetime.now()

    messages = state["log_messages"]
    time_ordered_messages = [x.pretty_repr() for x in messages]
    time_ordered_messages.sort()

    print("Message Log:")
    print("\n".join(time_ordered_messages))

    initial_sub_qas = state["initial_sub_qas"]
    initial_sub_qa_list = []
    for initial_sub_qa in initial_sub_qas:
        if initial_sub_qa["sub_answer_check"] == "yes":
            initial_sub_qa_list.append(
                f'  Question:\n  {initial_sub_qa["sub_question"]}\n  --\n  Answer:\n  {initial_sub_qa["sub_answer"]}\n  -----'
            )

    initial_sub_qa_context = "\n".join(initial_sub_qa_list)

    log_message = generate_log_message(
        message="all - final_stuff",
        node_start_time=node_start_time,
        graph_start_time=state["graph_start_time"],
    )

    print(log_message)
    print("--------------------------------")

    base_answer = state["base_answer"]

    print(f"Final Base Answer:\n{base_answer}")
    print("--------------------------------")
    print(f"Initial Answered Sub Questions:\n{initial_sub_qa_context}")
    print("--------------------------------")

    if not state.get("deep_answer"):
        print("No Deep Answer was required")
        return {
            "log_messages": log_message,
        }

    deep_answer = state["deep_answer"]
    sub_qas = state["sub_qas"]
    sub_qa_list = []
    for sub_qa in sub_qas:
        if sub_qa["sub_answer_check"] == "yes":
            sub_qa_list.append(
                f'  Question:\n  {sub_qa["sub_question"]}\n  --\n  Answer:\n  {sub_qa["sub_answer"]}\n  -----'
            )

    sub_qa_context = "\n".join(sub_qa_list)

    print(f"Final Base Answer:\n{base_answer}")
    print("--------------------------------")
    print(f"Final Deep Answer:\n{deep_answer}")
    print("--------------------------------")
    print("Sub Questions and Answers:")
    print(sub_qa_context)

    return {
        "log_messages": generate_log_message(
            message="all - final_stuff",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
