from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from danswer.agent_search.deep_qa_graph.states import ResearchQAState
from danswer.agent_search.shared_graph_utils.prompts import BASE_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def generate(state: ResearchQAState) -> dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---SUB GENERATE---")
    node_start_time = datetime.now()

    question = state["sub_question"]
    docs = state["sub_question_verified_retrieval_docs"]

    print(f"Number of verified retrieval docs for sub-question: {len(docs)}")

    msg = [
        HumanMessage(
            content=BASE_RAG_PROMPT.format(question=question, context=format_docs(docs))
        )
    ]

    # Grader
    if len(docs) > 0:
        model = state["fast_llm"]
        response = list(
            model.stream(
                prompt=msg,
            )
        )
        response_str = merge_message_runs(response, chunk_separator="")[0].content
    else:
        response_str = ""

    return {
        "sub_question_answer": response_str,
        "log_messages": generate_log_message(
            message="sub - generate",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
