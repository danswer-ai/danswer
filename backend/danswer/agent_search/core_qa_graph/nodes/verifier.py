import datetime
from typing import Any

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from danswer.agent_search.primary_graph.states import VerifierState
from danswer.agent_search.shared_graph_utils.models import BinaryDecision
from danswer.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.llm.factory import get_default_llms


def sub_verifier(state: VerifierState) -> dict[str, Any]:
    """
    Check whether the document is relevant for the original user question

    Args:
        state (VerifierState): The current state

    Returns:
        dict: ict: The updated state with the final decision
    """

    # print("---VERIFY QUTPUT---")
    node_start_time = datetime.datetime.now()

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
    llm, fast_llm = get_default_llms()
    response = list(
        llm.stream(
            prompt=msg,
            # structured_response_format=BinaryDecision.model_json_schema(),
        )
    )

    response_string = merge_message_runs(response, chunk_separator="")[0].content
    # Convert string response to proper dictionary format
    decision_dict = {"decision": response_string.lower()}
    formatted_response = BinaryDecision.model_validate(decision_dict)

    print(f"Verification end time: {datetime.datetime.now()}")

    return {
        "sub_question_verified_retrieval_docs": [state["document"]]
        if formatted_response.decision == "yes"
        else [],
        "log_messages": generate_log_message(
            message=f"sub - verifier: {formatted_response.decision}",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
