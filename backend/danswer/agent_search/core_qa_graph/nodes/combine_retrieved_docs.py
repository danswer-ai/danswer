from datetime import datetime
from typing import Any

from danswer.agent_search.core_qa_graph.states import BaseQAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.context.search.models import InferenceSection


def sub_combine_retrieved_docs(state: BaseQAState) -> dict[str, Any]:
    """
    Dedupe the retrieved docs.
    """
    node_start_time = datetime.now()

    sub_question_base_retrieval_docs = state["sub_question_base_retrieval_docs"]

    print(f"Number of docs from steps: {len(sub_question_base_retrieval_docs)}")
    dedupe_docs: list[InferenceSection] = []
    for base_retrieval_doc in sub_question_base_retrieval_docs:
        if not any(
            base_retrieval_doc.center_chunk.document_id == doc.center_chunk.document_id
            for doc in dedupe_docs
        ):
            dedupe_docs.append(base_retrieval_doc)

    print(f"Number of deduped docs: {len(dedupe_docs)}")

    return {
        "sub_question_deduped_retrieval_docs": dedupe_docs,
        "log_messages": generate_log_message(
            message="sub - combine_retrieved_docs (dedupe)",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
