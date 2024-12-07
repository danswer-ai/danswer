from datetime import datetime
from typing import Any

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def base_wait(state: QAState) -> dict[str, Any]:
    """
    Ensures that all required steps are completed before proceeding to the next step

    Args:
        state (messages): The current state

    Returns:
        dict: {} (no operation, just logging)
    """

    print("---Base Wait ---")
    node_start_time = datetime.now()
    return {
        "log_messages": generate_log_message(
            message="core - base_wait",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
