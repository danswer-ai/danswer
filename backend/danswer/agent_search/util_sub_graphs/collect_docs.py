import operator
from datetime import datetime
from typing import Annotated

from danswer.agent_search.primary_state import PrimaryState
from danswer.context.search.models import InferenceSection


class CollectDocsInput(PrimaryState):
    sub_question_retrieval_docs: Annotated[list[InferenceSection], operator.add]
    sub_question_str: str
    graph_start_time: datetime


class CollectDocsOutput(PrimaryState):
    deduped_retrieval_docs: list[InferenceSection]


def collect_docs(state: CollectDocsInput) -> CollectDocsOutput:
    """
    Dedupe the retrieved docs.
    """

    sub_question_retrieval_docs = state["sub_question_retrieval_docs"]

    print(f"Number of docs from steps: {len(sub_question_retrieval_docs)}")
    dedupe_docs: list[InferenceSection] = []
    for retrieval_doc in sub_question_retrieval_docs:
        if not any(
            retrieval_doc.center_chunk.document_id == doc.center_chunk.document_id
            for doc in dedupe_docs
        ):
            dedupe_docs.append(retrieval_doc)

    print(f"Number of deduped docs: {len(dedupe_docs)}")

    return state
    # return CollectDocsOutput(
    #     deduped_retrieval_docs=dedupe_docs,
    # )
    return {
        "deduped_retrieval_docs": dedupe_docs,
        "test_var": "test_var",
    }
