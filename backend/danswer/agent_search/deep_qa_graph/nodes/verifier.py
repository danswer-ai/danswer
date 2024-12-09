import json
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage

from danswer.agent_search.primary_graph.states import VerifierState
from danswer.agent_search.shared_graph_utils.models import BinaryDecision
from danswer.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def verifier(state: VerifierState) -> dict[str, Any]:
    """
    Check whether the document is relevant for the original user question

    Args:
        state (VerifierState): The current state

    Returns:
        dict: ict: The updated state with the final decision
    """

    print("---SUB VERIFY QUTPUT---")
    node_start_time = datetime.now()

    question = state["question"]
    document_content = state["document"].combined_content

    msg = [
        HumanMessage(
            content=VERIFIER_PROMPT.format(
                question=question, document_content=document_content
            )
        )
    ]

    # Grader
    model = state["fast_llm"]
    response = list(
        model.stream(
            prompt=msg,
            structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    raw_response = json.loads(response[0].pretty_repr())
    formatted_response = BinaryDecision.model_validate(raw_response)

    return {
        "deduped_retrieval_docs": [state["document"]]
        if formatted_response.decision == "yes"
        else [],
        "log_messages": generate_log_message(
            message=f"core - verifier: {formatted_response.decision}",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
