from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from onyx.agent_search.expanded_retrieval.states import DocVerificationInput
from onyx.agent_search.expanded_retrieval.states import DocVerificationUpdate
from onyx.agent_search.shared_graph_utils.models import BinaryDecision
from onyx.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT


def doc_verification(state: DocVerificationInput) -> DocVerificationUpdate:
    """
    Check whether the document is relevant for the original user question

    Args:
        state (DocVerificationInput): The current state

    Updates:
        verified_documents: list[InferenceSection]
    """

    original_query = state["search_request"].query
    doc_to_verify = state["doc_to_verify"]
    document_content = doc_to_verify.combined_content

    msg = [
        HumanMessage(
            content=VERIFIER_PROMPT.format(
                question=original_query, document_content=document_content
            )
        )
    ]

    fast_llm = state["fast_llm"]
    response = list(
        fast_llm.stream(
            prompt=msg,
        )
    )

    response_string = merge_message_runs(response, chunk_separator="")[0].content
    # Convert string response to proper dictionary format
    decision_dict = {"decision": response_string.lower()}
    formatted_response = BinaryDecision.model_validate(decision_dict)

    verified_documents = []
    if formatted_response.decision == "yes":
        verified_documents.append(doc_to_verify)

    return DocVerificationUpdate(
        verified_documents=verified_documents,
    )
