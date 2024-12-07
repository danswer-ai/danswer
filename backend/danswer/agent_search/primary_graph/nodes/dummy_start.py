from datetime import datetime
from typing import Any

from danswer.agent_search.primary_graph.states import QAState


def dummy_start(state: QAState) -> dict[str, Any]:
    """
    Dummy node to set the start time
    """
    return {"start_time": datetime.now()}
