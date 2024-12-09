from datetime import datetime
from typing import Any

from danswer.agent_search.deep_qa_graph.states import ResearchQAState
from danswer.agent_search.shared_graph_utils.utils import generate_log_message


def combine_retrieved_docs(state: ResearchQAState) -> dict[str, Any]:
    """
    Dedupe the retrieved docs.
    """
    node_start_time = datetime.now()

    sub_question_base_retrieval_docs = state["sub_question_base_retrieval_docs"]

    print(f"Number of docs from steps: {len(sub_question_base_retrieval_docs)}")
    dedupe_docs = []
    for base_retrieval_doc in sub_question_base_retrieval_docs:
        if base_retrieval_doc not in dedupe_docs:
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
