import datetime
from typing import Any

from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def sub_dummy(state: BaseQAState) -> dict[str, Any]:
    """
    Dummy step
    """

    print("---Sub Dummy---")

    node_start_time = datetime.datetime.now()

    return {
        "graph_start_time": node_start_time,
        "log_messages": generate_log_message(
            message="sub - dummy",
            node_start_time=node_start_time,
            graph_start_time=node_start_time,
        ),
    }
