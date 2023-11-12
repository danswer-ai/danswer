import secrets
from typing import cast

from fastapi import APIRouter
from fastapi import Depends
from fastapi import Header
from fastapi import HTTPException
from sqlalchemy.orm import Session

from danswer.access.access import get_access_for_documents
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document
from danswer.connectors.models import IndexAttemptMetadata
from danswer.db.connector import fetch_connector_by_id
from danswer.db.connector import fetch_ingestion_connector_by_name
from danswer.db.connector_credential_pair import get_connector_credential_pair
from danswer.db.credentials import fetch_credential_by_id
from danswer.db.document import prepare_to_modify_documents
from danswer.db.document import update_docs_updated_at
from danswer.db.document_set import fetch_document_sets_for_documents
from danswer.db.engine import get_session
from danswer.document_index.factory import get_default_document_index
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.indexing.chunker import DefaultChunker
from danswer.indexing.embedder import DefaultEmbedder
from danswer.indexing.indexing_pipeline import upsert_documents_in_db
from danswer.indexing.models import DocMetadataAwareIndexChunk
from danswer.server.models import ApiKey
from danswer.server.models import IngestionDocument
from danswer.server.models import IngestionResult
from danswer.utils.logger import setup_logger

logger = setup_logger()

router = APIRouter(prefix="/api")

# Assumes this gives admin privileges, basic users should not be allowed to call any Danswer apis
_DANSWER_API_KEY = "danswer_api_key"


def get_danswer_api_key(key_len: int = 30, dont_regenerate: bool = False) -> str | None:
    kv_store = get_dynamic_config_store()
    try:
        return str(kv_store.load(_DANSWER_API_KEY))
    except ConfigNotFoundError:
        if dont_regenerate:
            return None

    logger.info("Generating Danswer API Key")

    api_key = "dn_" + secrets.token_urlsafe(key_len)
    kv_store.store(_DANSWER_API_KEY, api_key)

    return api_key


def delete_danswer_api_key() -> None:
    kv_store = get_dynamic_config_store()
    try:
        kv_store.delete(_DANSWER_API_KEY)
    except ConfigNotFoundError:
        pass


def api_key_dep(authorization: str = Header(...)) -> str:
    saved_key = get_danswer_api_key(dont_regenerate=True)
    token = authorization.removeprefix("Bearer ").strip()
    if token != saved_key or not saved_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return token


# Provides a way to recover if the api key is deleted for some reason
# Can also just restart the server to regenerate a new one
def api_key_dep_if_exist(authorization: str | None = Header(None)) -> str | None:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    saved_key = get_danswer_api_key(dont_regenerate=True)
    if not saved_key:
        return None

    if token != saved_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return token


@router.post("/regenerate-key")
def regenerate_key(_: str | None = Depends(api_key_dep_if_exist)) -> ApiKey:
    delete_danswer_api_key()
    return ApiKey(api_key=cast(str, get_danswer_api_key()))


@router.post("/doc-ingestion")
def document_ingestion(
    doc_info: IngestionDocument,
    _: str = Depends(api_key_dep),
    db_session: Session = Depends(get_session),
) -> IngestionResult:
    """Currently only attaches docs to existing connectors (cc-pairs).
    Or to the default ingestion connector that is accessible to all users

    Things to note:
    - The document id if not provided is automatically generated from the semantic identifier
      so if the document source type etc is updated, it won't create a duplicate
    """
    if doc_info.credential_id:
        credential_id = doc_info.credential_id
        credential = fetch_credential_by_id(
            credential_id=credential_id,
            user=None,
            db_session=db_session,
            assume_admin=True,
        )
        if credential is None:
            raise ValueError("Invalid Credential for doc, does not exist.")
    else:
        credential_id = 0

    connector_id = doc_info.connector_id
    # If user provides id and name, id takes precedence
    if connector_id is not None:
        connector = fetch_connector_by_id(connector_id, db_session)
        if connector is None:
            raise ValueError("Invalid Connector for doc, id does not exist.")
    elif doc_info.connector_name:
        connector = fetch_ingestion_connector_by_name(
            doc_info.connector_name, db_session
        )
        if connector is None:
            raise ValueError("Invalid Connector for doc, name does not exist.")
        connector_id = connector.id
    else:
        connector_id = 0

    cc_pair = get_connector_credential_pair(
        connector_id=connector_id, credential_id=credential_id, db_session=db_session
    )
    if cc_pair is None:
        raise ValueError("Connector and Credential not associated.")

    # Disregard whatever value is passed, this must be True
    doc_info.document.from_ingestion_api = True

    # If no source type passed in, use the ingestion_api type
    doc_info.document.source = doc_info.document.source or DocumentSource.INGESTION_API

    document = Document.from_base(doc_info.document)

    # TODO once the frontend is updated with this enum, remove this logic
    if document.source == DocumentSource.INGESTION_API:
        document.source = DocumentSource.FILE

    upsert_documents_in_db(
        documents=[document],
        index_attempt_metadata=IndexAttemptMetadata(
            connector_id=connector_id, credential_id=credential_id
        ),
        db_session=db_session,
    )

    chunker = DefaultChunker()
    embedder = DefaultEmbedder()
    document_index = get_default_document_index()

    # Acquires a lock on the document so that no other process can modify them
    prepare_to_modify_documents(db_session=db_session, document_ids=[document.id])

    chunks = chunker.chunk(document)
    chunks_with_embeddings = embedder.embed(chunks=chunks)

    access_info = list(
        get_access_for_documents(
            document_ids=[document.id], db_session=db_session
        ).values()
    )[0]

    document_id_to_document_set = {
        document_id: document_sets
        for document_id, document_sets in fetch_document_sets_for_documents(
            document_ids=[document.id], db_session=db_session
        )
    }
    access_aware_chunks = [
        DocMetadataAwareIndexChunk.from_index_chunk(
            index_chunk=chunk,
            access=access_info,
            document_sets=set(document_id_to_document_set.get(document.id, [])),
        )
        for chunk in chunks_with_embeddings
    ]

    insertion_record = list(
        document_index.index(
            chunks=access_aware_chunks,
        )
    )[0]

    if document.doc_updated_at is not None:
        update_docs_updated_at(
            ids_to_new_updated_at={document.id: document.doc_updated_at},
            db_session=db_session,
        )

    return IngestionResult(
        document_id=document.id, already_existed=insertion_record.already_existed
    )
