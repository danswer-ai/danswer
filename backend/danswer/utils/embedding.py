import logging
from dataclasses import dataclass
from typing import List

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from danswer.configs.app_configs import CHUNK_OVERLAP
from danswer.configs.app_configs import ENABLED_CONNECTOR_EMBEDDING_SETTINGS
from danswer.configs.model_configs import DOC_EMBEDDING_CONTEXT_SIZE
from danswer.db.connector import fetch_connector_by_id
from danswer.db.document_by_connector_credential_pair import (
    get_document_connector_credential_pair_by_document_id,
)
from danswer.db.engine import get_sqlalchemy_engine

logger = logging.getLogger(__name__)


@dataclass
class EmbeddingChunkConfig:
    embedding_size: int
    chunk_overlap: int


def _get_default_embedding_config() -> EmbeddingChunkConfig:
    return EmbeddingChunkConfig(
        embedding_size=DOC_EMBEDDING_CONTEXT_SIZE, chunk_overlap=CHUNK_OVERLAP
    )


def get_embedding_chunks_by_connector_id(
    connector_id: int | None, db_session: Session
) -> EmbeddingChunkConfig:
    if not ENABLED_CONNECTOR_EMBEDDING_SETTINGS or not connector_id:
        return _get_default_embedding_config()
    try:
        connector = fetch_connector_by_id(connector_id, db_session)
        if connector:
            return EmbeddingChunkConfig(
                embedding_size=connector.embedding_size,
                chunk_overlap=connector.chunk_overlap,
            )
        return _get_default_embedding_config()
    except SQLAlchemyError as e:
        logger.error(
            "Database error when fetching embedding chunks for connector %s: %s",
            connector_id,
            str(e),
        )
        raise


def get_embedding_chunks_by_document_id_with_session(
    document_id: str, db_session: Session
) -> EmbeddingChunkConfig:
    if not ENABLED_CONNECTOR_EMBEDDING_SETTINGS:
        return _get_default_embedding_config()
    try:
        connector_credential_pair = (
            get_document_connector_credential_pair_by_document_id(
                document_id, db_session
            )
        )
        if connector_credential_pair:
            connector = fetch_connector_by_id(
                connector_credential_pair.connector_id, db_session
            )
            if connector:
                return EmbeddingChunkConfig(
                    embedding_size=connector.embedding_size,
                    chunk_overlap=connector.chunk_overlap,
                )
        return _get_default_embedding_config()
    except SQLAlchemyError as e:
        logger.error(
            "Database error when fetching embedding chunks for document %s: %s",
            document_id,
            str(e),
        )
        raise


def get_embedding_chunks_by_document_id(document_id: str) -> EmbeddingChunkConfig:
    if not ENABLED_CONNECTOR_EMBEDDING_SETTINGS:
        return _get_default_embedding_config()
    with Session(get_sqlalchemy_engine()) as db_session:
        return get_embedding_chunks_by_document_id_with_session(document_id, db_session)


def get_highest_embedding_chunk_size_by_document_ids(
    document_ids: List[str],
) -> EmbeddingChunkConfig:
    if not ENABLED_CONNECTOR_EMBEDDING_SETTINGS:
        return _get_default_embedding_config()
    highest_config = _get_default_embedding_config()
    with Session(get_sqlalchemy_engine()) as db_session:
        for document_id in document_ids:
            config = get_embedding_chunks_by_document_id_with_session(
                document_id, db_session
            )
            if config.embedding_size > highest_config.embedding_size:
                highest_config = config
    return highest_config
