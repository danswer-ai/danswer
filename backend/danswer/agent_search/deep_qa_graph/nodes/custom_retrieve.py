from datetime import datetime
from typing import Any

from danswer.agent_search.primary_graph.states import RetrieverState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.context.search.models import InferenceSection


def sub_custom_retrieve(state: RetrieverState) -> dict[str, Any]:
    """
    Retrieve documents

    Args:
        state (dict): The current graph state

    Returns:
        state (dict): New key added to state, documents, that contains retrieved documents
    """
    print("---RETRIEVE SUB---")
    node_start_time = datetime.now()

    # Retrieval
    # TODO: add the actual retrieval, probably from search_tool.run()
    documents: list[InferenceSection] = []

    return {
        "sub_question_base_retrieval_docs": documents,
        "log_messages": generate_log_message(
            message="sub - custom_retrieve",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
