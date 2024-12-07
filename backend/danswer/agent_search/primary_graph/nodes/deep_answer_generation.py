from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.prompts import COMBINED_CONTEXT
from danswer.agent_search.shared_graph_utils.prompts import MODIFIED_RAG_PROMPT
from danswer.agent_search.shared_graph_utils.utils import format_docs
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.agent_search.shared_graph_utils.utils import normalize_whitespace


# aggregate sub questions and answers
def deep_answer_generation(state: QAState) -> dict[str, Any]:
    """
    Generate answer

    Args:
        state (messages): The current state

    Returns:
         dict: The updated state with re-phrased question
    """
    print("---DEEP GENERATE---")

    node_start_time = datetime.now()

    question = state["original_question"]
    docs = state["deduped_retrieval_docs"]

    deep_answer_context = state["core_answer_dynamic_context"]

    print(f"Number of verified retrieval docs - deep: {len(docs)}")

    combined_context = normalize_whitespace(
        COMBINED_CONTEXT.format(
            deep_answer_context=deep_answer_context, formated_docs=format_docs(docs)
        )
    )

    msg = [
        HumanMessage(
            content=MODIFIED_RAG_PROMPT.format(
                question=question, combined_context=combined_context
            )
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = model.invoke(msg)

    return {
        "deep_answer": response.content,
        "log_messages": generate_log_message(
            message="deep - deep answer generation",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
