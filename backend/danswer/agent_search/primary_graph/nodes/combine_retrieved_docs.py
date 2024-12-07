from collections.abc import Sequence
from datetime import datetime
from typing import Any

from danswer.agent_search.primary_graph.states import QAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message
from danswer.context.search.models import InferenceSection


def combine_retrieved_docs(state: QAState) -> dict[str, Any]:
    """
    Dedupe the retrieved docs.
    """
    node_start_time = datetime.now()

    base_retrieval_docs: Sequence[InferenceSection] = state["base_retrieval_docs"]

    print(f"Number of docs from steps: {len(base_retrieval_docs)}")
    dedupe_docs: list[InferenceSection] = []
    for base_retrieval_doc in base_retrieval_docs:
        if not any(
            base_retrieval_doc.center_chunk.document_id == doc.center_chunk.document_id
            for doc in dedupe_docs
        ):
            dedupe_docs.append(base_retrieval_doc)

    print(f"Number of deduped docs: {len(dedupe_docs)}")

    return {
        "deduped_retrieval_docs": dedupe_docs,
        "log_messages": generate_log_message(
            message="core - combine_retrieved_docs (dedupe)",
            node_start_time=node_start_time,
            graph_start_time=state["graph_start_time"],
        ),
    }
