from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def generate(state: QAState) -> dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---GENERATE---")
    node_start_time = datetime.now()

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]

    print(f"Number of verified retrieval docs: {len(docs)}")

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=question, context=format_docs(docs))
        )
    ]

    # Grader
    llm = state["fast_llm"]
    response = list(
        llm.stream(
            prompt=msg,
            structured_response_format=None,
        )
    )

    return {
        "base_answer": response[0].pretty_repr(),
        "log_messages": generate_log_message(
            message="core - generate",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
