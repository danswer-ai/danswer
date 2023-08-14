from functools import partial
from itertools import chain
from typing import Protocol

from sqlalchemy.orm import Session

from danswer.chunking.chunk import Chunker
from danswer.chunking.chunk import DefaultChunker
from danswer.connectors.models import Document
from danswer.connectors.models import IndexAttemptMetadata
from danswer.datastores.interfaces import ChunkInsertionRecord
from danswer.datastores.interfaces import ChunkMetadata
from danswer.datastores.interfaces import KeywordIndex
from danswer.datastores.interfaces import StoreType
from danswer.datastores.interfaces import VectorIndex
from danswer.datastores.qdrant.store import QdrantIndex
from danswer.datastores.typesense.store import TypesenseIndex
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
    insertion_records: list[ChunkInsertionRecord],
    index_attempt_metadata: IndexAttemptMetadata,
    document_store_type: StoreType,
) -> None:
    with Session(get_sqlalchemy_engine()) as session:
        upsert_documents_complete(
            db_session=session,
            document_metadata_batch=[
                ChunkMetadata(
                    connector_id=index_attempt_metadata.connector_id,
                    credential_id=index_attempt_metadata.credential_id,
                    document_id=insertion_record.document_id,
                    store_id=insertion_record.store_id,
                    document_store_type=document_store_type,
                )
                for insertion_record in insertion_records
            ],
        )


def _get_net_new_documents(
    insertion_records: list[ChunkInsertionRecord],
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


def _indexing_pipeline(
    *,
    chunker: Chunker,
    embedder: Embedder,
    vector_index: VectorIndex,
    keyword_index: KeywordIndex,
    documents: list[Document],
    index_attempt_metadata: IndexAttemptMetadata,
) -> tuple[int, int]:
    """Takes different pieces of the indexing pipeline and applies it to a batch of documents
    Note that the documents should already be batched at this point so that it does not inflate the
    memory requirements"""
    chunks = list(chain(*[chunker.chunk(document=document) for document in documents]))
    # TODO keyword indexing can occur at same time as embedding
    keyword_store_insertion_records = keyword_index.index(
        chunks=chunks, index_attempt_metadata=index_attempt_metadata
    )
    logger.debug(f"Keyword store insertion records: {keyword_store_insertion_records}")
    _upsert_insertion_records(
        insertion_records=keyword_store_insertion_records,
        index_attempt_metadata=index_attempt_metadata,
        document_store_type=StoreType.KEYWORD,
    )
    net_doc_count_keyword = _get_net_new_documents(
        insertion_records=keyword_store_insertion_records
    )

    chunks_with_embeddings = embedder.embed(chunks=chunks)
    vector_store_insertion_records = vector_index.index(
        chunks=chunks_with_embeddings, index_attempt_metadata=index_attempt_metadata
    )
    logger.debug(f"Vector store insertion records: {keyword_store_insertion_records}")
    _upsert_insertion_records(
        insertion_records=vector_store_insertion_records,
        index_attempt_metadata=index_attempt_metadata,
        document_store_type=StoreType.VECTOR,
    )
    net_doc_count_vector = _get_net_new_documents(
        insertion_records=vector_store_insertion_records
    )
    if net_doc_count_vector != net_doc_count_keyword:
        logger.warning("Document count change from keyword/vector indices don't align")
    net_new_docs = max(net_doc_count_keyword, net_doc_count_vector)
    logger.info(f"Indexed {net_new_docs} new documents")
    return net_new_docs, len(chunks)


def build_indexing_pipeline(
    *,
    chunker: Chunker | None = None,
    embedder: Embedder | None = None,
    vector_index: VectorIndex | None = None,
    keyword_index: KeywordIndex | None = None,
) -> IndexingPipelineProtocol:
    """Builds a pipline which takes in a list (batch) of docs and indexes them.

    Default uses _ chunker, _ embedder, and qdrant for the datastore"""
    if chunker is None:
        chunker = DefaultChunker()

    if embedder is None:
        embedder = DefaultEmbedder()

    if vector_index is None:
        vector_index = QdrantIndex()

    if keyword_index is None:
        keyword_index = TypesenseIndex()

    return partial(
        _indexing_pipeline,
        chunker=chunker,
        embedder=embedder,
        vector_index=vector_index,
        keyword_index=keyword_index,
    )
