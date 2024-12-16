import datetime

from langchain_core.messages import HumanMessage
from langchain_core.messages import merge_message_runs

from danswer.agent_search.expanded_retrieval.states import DocRetrievalOutput
from danswer.agent_search.expanded_retrieval.states import DocVerificationOutput
from danswer.agent_search.shared_graph_utils.models import BinaryDecision
from danswer.agent_search.shared_graph_utils.prompts import VERIFIER_PROMPT


def doc_verification(state: DocRetrievalOutput) -> DocVerificationOutput:
    """
    Check whether the document is relevant for the original user question

    Args:
        state (VerifierState): The current state

    Returns:
        dict: ict: The updated state with the final decision
    """

    # print(f"--- doc_verification state ---")

    if "query_to_answer" in state.keys():
        query_to_answer = state["query_to_answer"]
    else:
        query_to_answer = state["search_request"].query

    doc_to_verify = state["doc_to_verify"]
    document_content = doc_to_verify.combined_content

    msg = [
        HumanMessage(
            content=VERIFIER_PROMPT.format(
                question=query_to_answer, document_content=document_content
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

        print(
            f"Verdict & Completion: {formatted_response.decision} -- {datetime.datetime.now()}"
        )

    return DocVerificationOutput(
        verified_documents=verified_documents,
    )
