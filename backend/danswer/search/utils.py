from collections.abc import Sequence
from typing import TypeVar

from danswer.configs.constants import DocumentSource
from danswer.db.models import SearchDoc as DBSearchDoc
from danswer.search.models import InferenceChunk
from danswer.search.models import InferenceSection
from danswer.search.models import SavedSearchDoc
from danswer.search.models import SearchDoc
from danswer.tools.internet_search.internet_search_tool import InternetSearchResponse


T = TypeVar("T", InferenceSection, InferenceChunk, SearchDoc)


def dedupe_documents(items: list[T]) -> tuple[list[T], list[int]]:
    seen_ids = set()
    deduped_items = []
    dropped_indices = []
    for index, item in enumerate(items):
        if isinstance(item, InferenceSection):
            document_id = item.center_chunk.document_id
        else:
            document_id = item.document_id

        if document_id not in seen_ids:
            seen_ids.add(document_id)
            deduped_items.append(item)
        else:
            dropped_indices.append(index)
    return deduped_items, dropped_indices


def drop_llm_indices(
    llm_indices: list[int],
    search_docs: Sequence[DBSearchDoc | SavedSearchDoc],
    dropped_indices: list[int],
) -> list[int]:
    llm_bools = [True if i in llm_indices else False for i in range(len(search_docs))]
    if dropped_indices:
        llm_bools = [
            val for ind, val in enumerate(llm_bools) if ind not in dropped_indices
        ]
    return [i for i, val in enumerate(llm_bools) if val]


def chunks_or_sections_to_search_docs(
    items: Sequence[InferenceChunk | InferenceSection] | None,
) -> list[SearchDoc]:
    if not items:
        return []

    search_docs = [
        SearchDoc(
            document_id=(
                chunk := item.center_chunk
                if isinstance(item, InferenceSection)
                else item
            ).document_id,
            chunk_ind=chunk.chunk_id,
            semantic_identifier=chunk.semantic_identifier or "Unknown",
            link=chunk.source_links[0] if chunk.source_links else None,
            blurb=chunk.blurb,
            source_type=chunk.source_type,
            boost=chunk.boost,
            hidden=chunk.hidden,
            metadata=chunk.metadata,
            score=chunk.score,
            match_highlights=chunk.match_highlights,
            updated_at=chunk.updated_at,
            primary_owners=chunk.primary_owners,
            secondary_owners=chunk.secondary_owners,
            is_internet=False,
        )
        for item in items
    ]

    return search_docs


def internet_search_response_to_search_docs(
    internet_search_response: InternetSearchResponse,
) -> list[SearchDoc]:
    return [
        SearchDoc(
            document_id=doc.link,
            chunk_ind=-1,
            semantic_identifier=doc.title,
            link=doc.link,
            blurb=doc.snippet,
            source_type=DocumentSource.NOT_APPLICABLE,
            boost=0,
            hidden=False,
            metadata={},
            score=None,
            match_highlights=[],
            updated_at=None,
            primary_owners=[],
            secondary_owners=[],
            is_internet=True,
        )
        for doc in internet_search_response.internet_results
    ]
