import json
from typing import Any, List, Set

from danswer.configs.constants import DocumentSource
from danswer.connectors.cross_connector_utils.miscellaneous_utils import get_experts_stores_representations
import danswer.document_index.document_index_utils as docs_util
from danswer.document_index.interfaces import DocumentIndex
from danswer.document_index.interfaces import DocumentInsertionRecord
from danswer.document_index.interfaces import UpdateRequest
from danswer.document_index.utils import remove_invalid_unicode_chars, get_updated_at_attribute
from danswer.indexing.models import DocMetadataAwareIndexChunk
from danswer.indexing.models import InferenceChunk
from danswer.search.models import IndexFilters

from sqlalchemy import Column, Integer, Text, Boolean, Float, JSON
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, REAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from contextlib import contextmanager

Base = declarative_base()


class DocumentChunk(Base):
    __tablename__ = 'document_chunk'

    document_id = Column(Text, primary_key=True, nullable=False)
    chunk_id = Column(Integer, primary_key=True, nullable=False)
    semantic_identifier = Column(Text)
    skip_title = Column(Boolean)
    title = Column(Text)
    content = Column(Text)
    content_summary = Column(Text)
    title_embedding = Column(ARRAY(REAL))  # Assuming a fixed known dimension size
    embeddings = Column(ARRAY(REAL))  # Assuming a fixed array size of 768
    blurb = Column(Text)
    source_type = Column(Text)
    source_links = Column(JSONB)
    section_continuation = Column(Boolean)
    boost = Column(Float)
    hidden = Column(Boolean)
    metadata_list = Column(JSONB)
    metadata_object = Column(JSONB, name="metadata")
    doc_updated_at = Column(Integer)
    primary_owners = Column(JSONB)
    secondary_owners = Column(JSONB)
    access_control_list = Column(JSONB)
    document_sets = Column(JSONB)


class PSQLIndex(DocumentIndex):
    def __init__(self, engine, index_name: str, **kwargs: Any) -> None:
        super().__init__(index_name, **kwargs)
        self.engine = engine
        self.Session = sessionmaker(bind=self.engine)

    @contextmanager
    def session(self):
        session = self.Session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def ensure_indices_exist(self, index_embedding_dim: int, secondary_index_embedding_dim: int | None) -> None:
        pass

    def update(self, update_requests: list[UpdateRequest]) -> None:
        pass

    def delete(self, doc_ids: list[str]) -> None:
        pass

    def admin_retrieval(self, query: str,
                        filters: IndexFilters,
                        num_to_retrieve: int, offset: int = 0) -> list[InferenceChunk]:
        pass

    def id_based_retrieval(self, document_id: str,
                           chunk_ind: int | None, filters: IndexFilters) -> list[InferenceChunk]:
        pass

    def keyword_retrieval(self, query: str, filters: IndexFilters, time_decay_multiplier: float, num_to_retrieve: int,
                          offset: int = 0) -> list[InferenceChunk]:
        pass

    def semantic_retrieval(self, query: str, query_embedding: list[float], filters: IndexFilters,
                           time_decay_multiplier: float, num_to_retrieve: int, offset: int = 0) -> list[InferenceChunk]:
        with self.session() as session:
            detailed_chunk_query = text("""
                            SELECT document_id, chunk_id, semantic_identifier, skip_title, title, content, content_summary,
                                   title_embedding, embeddings, blurb, source_type, source_links, section_continuation,
                                   boost, hidden, metadata_list, metadata, doc_updated_at, primary_owners, secondary_owners,
                                   access_control_list, document_sets
                            FROM document_chunk
                            WHERE document_id IN (
                                SELECT document_id
                                FROM document_chunk
                                WHERE 1 - (embedding_vector::vector <=> :query_embedding::vector) > :similarity_threshold
                                LIMIT :top_k OFFSET :offset
                            )
                            ORDER BY 1 - (embedding_vector::vector <=> :query_embedding::vector) DESC
                        """)
            detailed_chunk_results = session.execute(detailed_chunk_query, {
                'query_embedding': query_embedding,
                'similarity_threshold': 0.5,
                'top_k': num_to_retrieve,
                'offset': offset
            })
            inference_chunks: List[InferenceChunk] = []
            for result in detailed_chunk_results:
                detailed_chunk_query = text("""
                    SELECT document_id, chunk_id, semantic_identifier, skip_title, title, content, content_summary,
                           title_embedding, embeddings, blurb, source_type, source_links, section_continuation,
                           boost, hidden, metadata_list, metadata, doc_updated_at, primary_owners, secondary_owners,
                           access_control_list, document_sets
                    FROM document_chunk WHERE document_id = :document_id AND chunk_id = :chunk_id
                """)
                detailed_chunk_results = session.execute(detailed_chunk_query, {
                    'document_id': result['document_id'],
                    'chunk_id': result['chunk_id']
                })
                detailed_chunk = detailed_chunk_results.fetchone()

                # Transform the SQL result into an InferenceChunk object
                if detailed_chunk:
                    inference_chunk = InferenceChunk(
                        document_id=detailed_chunk.document_id,
                        source_type=DocumentSource(detailed_chunk.source_type),  # Assuming enum conversion
                        semantic_identifier=detailed_chunk.semantic_identifier,
                        boost=detailed_chunk.boost,
                        recency_bias=detailed_chunk.recency_bias,
                        score=detailed_chunk.score,
                        hidden=detailed_chunk.hidden,
                        metadata=json.loads(detailed_chunk.metadata),
                        match_highlights=json.loads(detailed_chunk.match_highlights),
                        updated_at=detailed_chunk.updated_at,
                        primary_owners=json.loads(detailed_chunk.primary_owners),
                        secondary_owners=json.loads(detailed_chunk.secondary_owners)
                    )
                    inference_chunks.append(inference_chunk)

            return inference_chunks

    def hybrid_retrieval(self, query: str, query_embedding: list[float], filters: IndexFilters,
                         time_decay_multiplier: float, num_to_retrieve: int, offset: int = 0,
                         hybrid_alpha: float | None = None) -> list[InferenceChunk]:
        pass

    def index(self, chunks: list[DocMetadataAwareIndexChunk]) -> set[DocumentInsertionRecord]:
        insertion_records = set()
        with self.session() as session:
            for chunk in chunks:
                doc_id = chunk.source_document.id
                chunk_id = chunk.chunk_id
                # Check if the document chunk already exists
                existing_chunk = session.query(DocumentChunk).get((doc_id, chunk_id))
                already_existed = existing_chunk is not None

                # If the document chunk exists, delete it before re-inserting
                if already_existed:
                    continue

                # Transform chunk into a dictionary suitable for insertion
                chunk_data = chunk_to_dict(chunk)

                # Insert the new document chunk
                session.add(DocumentChunk(**chunk_data))
                insertion_records.add(DocumentInsertionRecord(document_id=doc_id, already_existed=already_existed))

        return insertion_records


def chunk_to_dict(chunk: DocMetadataAwareIndexChunk) -> dict:
    document = chunk.source_document
    embeddings = chunk.embeddings

    title = document.get_title_for_document_index()

    return {
        "document_id": document.id,
        "chunk_id": chunk.chunk_id,
        "semantic_identifier": remove_invalid_unicode_chars(document.semantic_identifier),
        "skip_title": not title,
        "title": remove_invalid_unicode_chars(title) if title else None,
        "content": remove_invalid_unicode_chars(chunk.content),
        "content_summary": remove_invalid_unicode_chars(chunk.content),  # Needed for keyword highlighting
        "source_type": str(document.source.value),
        "source_links": json.dumps(chunk.source_links),
        "blurb": remove_invalid_unicode_chars(chunk.blurb),
        "section_continuation": chunk.section_continuation,
        "boost": chunk.boost,
        "hidden": False,  # Assuming default value as False since it's not provided in Vespa function
        "metadata_list": json.dumps(chunk.source_document.get_metadata_str_attributes()),
        "metadata_object": json.dumps(document.metadata),
        "doc_updated_at": get_updated_at_attribute(document.doc_updated_at),
        "primary_owners": json.dumps(get_experts_stores_representations(document.primary_owners)),
        "secondary_owners": json.dumps(get_experts_stores_representations(document.secondary_owners)),
        "access_control_list": json.dumps({acl_entry: 1 for acl_entry in chunk.access.to_acl()}),
        "document_sets": json.dumps({document_set: 1 for document_set in chunk.document_sets}),
        "title_embedding": chunk.title_embedding,  # Assuming it's already a list of floats
        "embeddings": embeddings.full_embedding,  # Flatten the embeddings
    }
