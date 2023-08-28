from functools import partial
from itertools import chain
from typing import Protocol

from sqlalchemy.orm import Session

from danswer.chunking.chunk import Chunker
from danswer.chunking.chunk import DefaultChunker
from danswer.chunking.models import DocAwareChunk
from danswer.connectors.models import Document
from danswer.connectors.models import IndexAttemptMetadata
from danswer.datastores.document_index import get_default_document_index
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import DocumentInsertionRecord
from danswer.datastores.interfaces import DocumentMetadata
from danswer.db.document import upsert_documents_complete
from danswer.db.engine import get_sqlalchemy_engine
from danswer.search.models import Embedder
from danswer.search.semantic_search import DefaultEmbedder
from danswer.utils.logger import setup_logger

logger = setup_logger()


class IndexingPipelineProtocol(Protocol):
    def __call__(
        self, documents: list[Document], index_attempt_metadata: IndexAttemptMetadata
    ) -> tuple[int, int]:
        ...


def _upsert_insertion_records(
    insertion_records: set[DocumentInsertionRecord],
    index_attempt_metadata: IndexAttemptMetadata,
    doc_m_data_lookup: dict[str, tuple[str, str]],
) -> None:
    with Session(get_sqlalchemy_engine()) as session:
        upsert_documents_complete(
            db_session=session,
            document_metadata_batch=[
                DocumentMetadata(
                    connector_id=index_attempt_metadata.connector_id,
                    credential_id=index_attempt_metadata.credential_id,
                    document_id=i_r.document_id,
                    semantic_identifier=doc_m_data_lookup[i_r.document_id][0],
                    first_link=doc_m_data_lookup[i_r.document_id][1],
                )
                for i_r in insertion_records
            ],
        )


def _get_net_new_documents(
    insertion_records: list[DocumentInsertionRecord],
) -> int:
    net_new_documents = 0
    seen_documents: set[str] = set()
    for insertion_record in insertion_records:
        if insertion_record.already_existed:
            continue

        if insertion_record.document_id not in seen_documents:
            net_new_documents += 1
            seen_documents.add(insertion_record.document_id)
    return net_new_documents


def _extract_minimal_document_metadata(doc: Document) -> tuple[str, str]:
    first_link = next((section.link for section in doc.sections if section.link), "")
    return doc.semantic_identifier, first_link


def _indexing_pipeline(
    *,
    chunker: Chunker,
    embedder: Embedder,
    document_index: DocumentIndex,
    documents: list[Document],
    index_attempt_metadata: IndexAttemptMetadata,
) -> tuple[int, int]:
    """Takes different pieces of the indexing pipeline and applies it to a batch of documents
    Note that the documents should already be batched at this point so that it does not inflate the
    memory requirements"""

    document_metadata_lookup = {
        doc.id: _extract_minimal_document_metadata(doc) for doc in documents
    }

    chunks: list[DocAwareChunk] = list(
        chain(*[chunker.chunk(document=document) for document in documents])
    )
    logger.debug(
        f"Indexing the following chunks: {[chunk.to_short_descriptor() for chunk in chunks]}"
    )
    chunks_with_embeddings = embedder.embed(chunks=chunks)

    # A document will not be spread across different batches, so all the documents with chunks in this set, are fully
    # represented by the chunks in this set
    insertion_records = document_index.index(
        chunks=chunks_with_embeddings, index_attempt_metadata=index_attempt_metadata
    )

    # TODO (chris): remove this try/except after issue with null document_id is resolved
    try:
        _upsert_insertion_records(
            insertion_records=insertion_records,
            index_attempt_metadata=index_attempt_metadata,
            doc_m_data_lookup=document_metadata_lookup,
        )
    except Exception as e:
        logger.error(
            f"Failed to upsert insertion records from vector index for documents: "
            f"{[document.to_short_descriptor() for document in documents]}, "
            f"for chunks: {[chunk.to_short_descriptor() for chunk in chunks_with_embeddings]}"
            f"for insertion records: {insertion_records}"
        )
        raise e

    return len([r for r in insertion_records if r.already_existed is False]), len(
        chunks
    )


def build_indexing_pipeline(
    *,
    chunker: Chunker | None = None,
    embedder: Embedder | None = None,
    document_index: DocumentIndex | None = None,
) -> IndexingPipelineProtocol:
    """Builds a pipline which takes in a list (batch) of docs and indexes them."""
    chunker = chunker or DefaultChunker()

    embedder = embedder or DefaultEmbedder()

    document_index = document_index or get_default_document_index()

    return partial(
        _indexing_pipeline,
        chunker=chunker,
        embedder=embedder,
        document_index=document_index,
    )
