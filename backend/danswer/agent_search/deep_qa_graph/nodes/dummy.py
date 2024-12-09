from datetime import datetime
from typing import Any

from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def dummy(state: BaseQAState) -> dict[str, Any]:
    """
    Dummy step
    """

    print("---Sub Dummy---")

    return {
        "log_messages": generate_log_message(
            message="sub - dummy",
            node_start_time=datetime.now(),
            graph_start_time=state["graph_start_time"],
        ),
    }
