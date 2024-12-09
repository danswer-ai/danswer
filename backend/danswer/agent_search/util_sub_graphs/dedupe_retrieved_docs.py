from datetime import datetime
from typing import TypedDict

from langgraph.graph import END
from langgraph.graph import START
from langgraph.graph import StateGraph

from danswer.context.search.models import InferenceSection


class DedupeRetrievedDocsInput(TypedDict):
    pre_dedupe_docs: list[InferenceSection]


class DedupeRetrievedDocsOutput(TypedDict):
    deduped_docs: list[InferenceSection]


def dedupe_retrieved_docs(state: DedupeRetrievedDocsInput) -> DedupeRetrievedDocsOutput:
    """
    Dedupe the retrieved docs.
    """
    datetime.now()

    pre_dedupe_docs = state["pre_dedupe_docs"]

    print(f"Number of docs from steps: {len(pre_dedupe_docs)}")
    dedupe_docs: list[InferenceSection] = []
    for pre_dedupe_doc in pre_dedupe_docs:
        if not any(
            pre_dedupe_doc.center_chunk.document_id == doc.center_chunk.document_id
            for doc in dedupe_docs
        ):
            dedupe_docs.append(pre_dedupe_doc)

    print(f"Number of deduped docs: {len(dedupe_docs)}")

    return DedupeRetrievedDocsOutput(
        deduped_docs=dedupe_docs,
    )


def build_dedupe_retrieved_docs_graph() -> StateGraph:
    dedupe_retrieved_docs_graph = StateGraph(
        state_schema=DedupeRetrievedDocsInput,
        input=DedupeRetrievedDocsInput,
        output=DedupeRetrievedDocsOutput,
    )

    dedupe_retrieved_docs_graph.add_node(
        node="dedupe_retrieved_docs",
        action=dedupe_retrieved_docs,
    )

    dedupe_retrieved_docs_graph.add_edge(
        start_key=START,
        end_key="dedupe_retrieved_docs",
    )

    dedupe_retrieved_docs_graph.add_edge(
        start_key="dedupe_retrieved_docs",
        end_key=END,
    )

    return dedupe_retrieved_docs_graph
