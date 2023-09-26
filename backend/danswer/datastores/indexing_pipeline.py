from functools import partial
from itertools import chain
from typing import Protocol

from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_documents
from danswer.chunking.chunk import Chunker
from danswer.chunking.chunk import DefaultChunker
from danswer.chunking.models import DocAwareChunk
from danswer.chunking.models import DocMetadataAwareIndexChunk
from danswer.connectors.models import Document
from danswer.connectors.models import IndexAttemptMetadata
from danswer.datastores.document_index import get_default_document_index
from danswer.datastores.interfaces import DocumentIndex
from danswer.datastores.interfaces import DocumentMetadata
from danswer.db.document import prepare_to_modify_documents
from danswer.db.document import upsert_documents_complete
from danswer.db.document_set import fetch_document_sets_for_documents
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


def _upsert_documents(
    document_ids: list[str],
    index_attempt_metadata: IndexAttemptMetadata,
    doc_m_data_lookup: dict[str, tuple[str, str]],
    db_session: Session,
) -> None:
    upsert_documents_complete(
        db_session=db_session,
        document_metadata_batch=[
            DocumentMetadata(
                connector_id=index_attempt_metadata.connector_id,
                credential_id=index_attempt_metadata.credential_id,
                document_id=document_id,
                semantic_identifier=doc_m_data_lookup[document_id][0],
                first_link=doc_m_data_lookup[document_id][1],
            )
            for document_id in document_ids
        ],
    )


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
    document_ids = [document.id for document in documents]
    document_metadata_lookup = {
        doc.id: _extract_minimal_document_metadata(doc) for doc in documents
    }

    with Session(get_sqlalchemy_engine()) as db_session:
        # acquires a lock on the documents so that no other process can modify them
        prepare_to_modify_documents(db_session=db_session, document_ids=document_ids)

        # create records in the source of truth about these documents
        _upsert_documents(
            document_ids=document_ids,
            index_attempt_metadata=index_attempt_metadata,
            doc_m_data_lookup=document_metadata_lookup,
            db_session=db_session,
        )

        chunks: list[DocAwareChunk] = list(
            chain(*[chunker.chunk(document=document) for document in documents])
        )
        logger.debug(
            f"Indexing the following chunks: {[chunk.to_short_descriptor() for chunk in chunks]}"
        )
        chunks_with_embeddings = embedder.embed(chunks=chunks)

        # Attach the latest status from Postgres (source of truth for access) to each
        # chunk. This access status will be attached to each chunk in the document index
        # TODO: attach document sets to the chunk based on the status of Postgres as well
        document_id_to_access_info = get_access_for_documents(
            document_ids=document_ids, db_session=db_session
        )
        document_id_to_document_set = {
            document_id: document_sets
            for document_id, document_sets in fetch_document_sets_for_documents(
                document_ids=document_ids, db_session=db_session
            )
        }
        access_aware_chunks = [
            DocMetadataAwareIndexChunk.from_index_chunk(
                index_chunk=chunk,
                access=document_id_to_access_info[chunk.source_document.id],
                document_sets=set(
                    document_id_to_document_set.get(chunk.source_document.id, [])
                ),
            )
            for chunk in chunks_with_embeddings
        ]

        # A document will not be spread across different batches, so all the
        # documents with chunks in this set, are fully represented by the chunks
        # in this set
        insertion_records = document_index.index(
            chunks=access_aware_chunks,
        )

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
